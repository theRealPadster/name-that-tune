/* eslint-disable */
/// <reference path="../../spicetify-cli/globals.d.ts" />
/// <reference path="../../spicetify-cli/jsHelper/spicetifyWrapper.js" />
/* eslint-enable */

const { Type } = Spicetify.URI;

export async function Queue(list, context = null) {
  const count = list.length;

  // Delimits the end of our list, as Spotify may add new context tracks to the queue
  list.push('spotify:delimiter');

  const { _queue, _client } = Spicetify.Platform.PlayerAPI._queue;
  const { prevTracks, queueRevision } = _queue;

  // Format tracks with default values
  const nextTracks = list.map(uri => ({
    contextTrack: {
      uri,
      uid: '',
      metadata: {
        is_queued: 'false',
      },
    },
    removed: [],
    blocked: [],
    provider: 'context',
  }));

  // Lowest level setQueue method from vendor~xpui.js
  _client.setQueue({
    nextTracks,
    prevTracks,
    queueRevision,
  });

  if (context) {
    const { sessionId } = Spicetify.Platform.PlayerAPI.getState();
    Spicetify.Platform.PlayerAPI.updateContext(sessionId, { uri: context, url: 'context://' + context });
  }

  Spicetify.Player.next();

  Spicetify.showNotification(`Shuffled ${count} Songs`);
}

export function shuffle(array) {
  let counter = array.length;
  if (counter <= 1) return array;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    const index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    const temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }
  return array.filter(track => track);
}

async function fetchPlaylistTracks(uri) {
  const res = await Spicetify.CosmosAsync.get(`sp://core-playlist/v1/playlist/spotify:playlist:${uri}/rows`, {
    policy: {
      link: true,
      playable: true,
    },
  });
  return res.rows.filter(track => track.playable).map(track => track.link);
}

async function fetchAlbumTracks(uri, includeMetadata = false) {
  const { queryAlbumTracks } = Spicetify.GraphQL.Definitions;
  const { data, errors } = await Spicetify.GraphQL.Request(queryAlbumTracks, { uri, offset: 0, limit: 500 });

  if (errors) throw errors[0].message;
  if (data.albumUnion.playability.playable === false) throw 'Album is not playable';

  return data.albumUnion.tracks.items.filter(({ track }) => track.playability.playable).map(({ track }) => (includeMetadata ? track : track.uri));
}

async function scanForTracksFromAlbums(res, artistName) {
  const allTracks: unknown[] = [];

  for (const album of res) {
    let albumRes;

    try {
      albumRes = await fetchAlbumTracks(album.uri, true);
    } catch (error) {
      console.error(album, error);
      continue;
    }

    for (const track of albumRes) {
      // TODO: Idk what this does, hopefully this works?
      // if (!CONFIG.artistNameMust || track.artists.items.some(artist => artist.profile.name === artistName)) {
      if (track.artists.items.some(artist => artist.profile.name === artistName)) {
        allTracks.push(track.uri);
      }
    }
  }

  return allTracks;
}

async function fetchArtistTracks(uri) {
  const { queryArtistDiscographyAll, queryArtistOverview } = Spicetify.GraphQL.Definitions;

  const discography = await Spicetify.GraphQL.Request(queryArtistDiscographyAll, {
    uri,
    offset: 0,
    // Limit 100 since GraphQL has resource limit
    limit: 100,
  });
  if (discography.errors) throw discography.errors[0].message;

  const overview = await Spicetify.GraphQL.Request(queryArtistOverview, {
    uri,
    locale: Spicetify.Locale.getLocale(),
    includePrerelease: false,
  });
  if (overview.errors) throw overview.errors[0].message;

  const artistName = overview.data.artistUnion.profile.name;
  const releases = discography.data.artistUnion.discography.all.items.map(({ releases }) => releases.items).flat();

  const artistAlbums = releases.filter(album => album.type === 'ALBUM');
  const artistSingles = releases.filter(album => album.type === 'SINGLE' || album.type === 'EP');

  if (artistAlbums.length === 0 && artistSingles.length === 0) throw 'Artist has no releases';

  // const allArtistAlbumsTracks = CONFIG.artistMode !== 'single' ? await scanForTracksFromAlbums(artistAlbums, artistName, 'album') : [];
  // const allArtistSinglesTracks = CONFIG.artistMode !== 'album' ? await scanForTracksFromAlbums(artistSingles, artistName, 'single') : [];
  // TODO: I think I just want the singles?
  const allArtistSinglesTracks = await scanForTracksFromAlbums(artistSingles, artistName);

  return allArtistSinglesTracks;
}

async function fetchLocalTracks() {
  const res = await Spicetify.Platform.LocalFilesAPI.getTracks();

  return res.map(track => track.uri);
}

async function fetchLikedTracks() {
  const res = await Spicetify.CosmosAsync.get('sp://core-collection/unstable/@/list/tracks/all?responseFormat=protobufJson');

  return res.item.filter(track => track.trackMetadata.playable).map(track => track.trackMetadata.link);
}

async function fetchCollection(uriObj) {
  const { category, type } = uriObj;
  const { pathname } = Spicetify.Platform.History.location;

  switch (type) {
  case Type.TRACK:
  case Type.LOCAL_TRACK:
    switch (pathname) {
    case '/collection/tracks':
      return await fetchLikedTracks();
    case '/collection/local-files':
      return await fetchLocalTracks();
    }
    break;
  case Type.COLLECTION:
    switch (category) {
    case 'tracks':
      return await fetchLikedTracks();
    case 'local-files':
      return await fetchLocalTracks();
    }
  }
}

function searchFolder(rows, uri) {
  for (const r of rows) {
    if (r.type !== 'folder' || !r.rows) continue;

    if (r.link === uri) return r;

    const found = searchFolder(r.rows, uri);
    if (found) return found;
  }
}

async function fetchFolderTracks(uri) {
  const res = await Spicetify.CosmosAsync.get(`sp://core-playlist/v1/rootlist`, {
    policy: { folder: { rows: true, link: true } },
  });

  const requestFolder = searchFolder(res.rows, uri);
  if (!requestFolder) throw 'Cannot find folder';

  const requestPlaylists: unknown[] = [];
  async function fetchNested(folder) {
    if (!folder.rows) return;

    for (const i of folder.rows) {
      if (i.type === 'playlist') requestPlaylists.push(await fetchPlaylistTracks(i.link.split(':')[2]));
      else if (i.type === 'folder') await fetchNested(i);
    }
  }

  await fetchNested(requestFolder);

  return requestPlaylists.flat();
}

async function fetchShows(uri) {
  const res = await Spicetify.CosmosAsync.get(`sp://core-show/v1/shows/${uri}?responseFormat=protobufJson`);
  return res.items.filter(track => track.episodePlayState.isPlayable).map(track => track.episodeMetadata.link);
}

export async function fetchAndPlay(rawUri) {
  let list,
    context,
    type,
    uri;

  try {
    if (typeof rawUri === 'object') {
      list = rawUri;
      context = null;
    } else {
      const uriObj = Spicetify.URI.fromString(rawUri);
      type = uriObj.type;
      uri = uriObj._base62Id ?? uriObj.id;

      switch (type) {
      case Type.PLAYLIST:
      case Type.PLAYLIST_V2:
        list = await fetchPlaylistTracks(uri);
        break;
      case Type.ALBUM:
        list = await fetchAlbumTracks(rawUri);
        break;
      case Type.ARTIST + '':
        list = await fetchArtistTracks(rawUri);
        break;
      case Type.TRACK:
      case Type.LOCAL_TRACK:
      case Type.COLLECTION:
        list = await fetchCollection(uriObj);
        break;
      case Type.FOLDER:
        list = await fetchFolderTracks(rawUri);
        break;
      case Type.SHOW:
        list = await fetchShows(uri);
        break;
      }

      if (!list?.length) {
        Spicetify.showNotification('Nothing to play', true);
        return;
      }

      context = rawUri;
      if (type === 'folder' || type === 'collection') {
        context = null;
      }
    }

    await Queue(shuffle(list), context);
  } catch (error) {
    Spicetify.showNotification(String(error), true);
    console.error(error);
  }
}

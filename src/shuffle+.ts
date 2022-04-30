/// <reference path="../../spicetify-cli/globals.d.ts" />
/// <reference path="../../spicetify-cli/jsHelper/spicetifyWrapper.js" />

async function fetchListFromUri(uri: string): Promise<string[]> {
  const uriObj = Spicetify.URI.fromString(uri);
  switch (uriObj.type) {
    case Spicetify.URI.Type.SHOW:
      return await fetchShow(uriObj.getBase62Id());
    case Spicetify.URI.Type.PLAYLIST:
    case Spicetify.URI.Type.PLAYLIST_V2:
      return await fetchPlaylist(uri);
    case Spicetify.URI.Type.FOLDER:
      return await fetchFolder(uri);
    case Spicetify.URI.Type.ALBUM:
      return await fetchAlbum(uri);
    case Spicetify.URI.Type.COLLECTION:
      return await fetchCollection();
    case Spicetify.URI.Type.ARTIST:
      // if (playDiscography) {
      //   return await fetchDiscography(uri);
      // }
      return await fetchArtist(uri);
    case Spicetify.URI.Type.TRACK:
    case Spicetify.URI.Type.EPISODE:
      return [uri];
    case Spicetify.URI.Type.STATION:
    case Spicetify.URI.Type.RADIO:
      Spicetify.Platform.PlayerAPI.play(
        { uri: uri },
        { featureVersion: Spicetify.Platform.PlayerAPI._defaultFeatureVersion }
      );
      return ['playedstation'];
  }
  throw `Unsupported fetching URI type: ${uriObj.type}`;
}

const fetchPlaylist = async (uri: string): Promise<string[]> => {
  const res = await Spicetify.CosmosAsync.get(
    `sp://core-playlist/v1/playlist/${uri}/rows`,
    {
      policy: { link: true },
    }
  );
  return res.rows.map((item) => item.link);
};

/**
 *
 * @param {object} rows
 * @param {string} uri
 * @returns {object} folder
 */
const searchFolder = (rows, uri: string) => {
  for (const r of rows) {
    if (r.type !== 'folder' || r.rows == null) {
      continue;
    }

    if (r.link === uri) {
      return r;
    }

    const found = searchFolder(r.rows, uri);
    if (found) return found;
  }
};

const fetchFolder = async (uri: string): Promise<string[]> => {
  const res = await Spicetify.CosmosAsync.get(
    `sp://core-playlist/v1/rootlist`,
    {
      policy: { folder: { rows: true, link: true } },
    }
  );

  const requestFolder = searchFolder(res.rows, uri);
  if (requestFolder == null) {
    throw 'Cannot find folder';
  }

  let requestPlaylists = [];
  const fetchNested = (folder) => {
    if (!folder.rows) return;

    for (const i of folder.rows) {
      if (i.type === 'playlist') requestPlaylists.push(fetchPlaylist(i.link));
      else if (i.type === 'folder') fetchNested(i);
    }
  };

  fetchNested(requestFolder);

  return (await Promise.all(requestPlaylists)).flat();
};

const fetchCollection = async (): Promise<string[]> => {
  const res = await Spicetify.CosmosAsync.get(
    'sp://core-collection/unstable/@/list/tracks/all?responseFormat=protobufJson',
    {
      policy: { list: { link: true } },
    }
  );
  return res.item.map((item) => item.trackMetadata.link);
};

const fetchAlbum = async (uri: string): Promise<string[]> => {
  const arg = uri.split(':')[2];
  const res = await Spicetify.CosmosAsync.get(
    `https://api.spotify.com/v1/albums/${arg}`
  );
  return res.tracks.items.map((item) => item.uri);
};

const fetchShow = async (uriBase62: string): Promise<string[]> => {
  const res = await Spicetify.CosmosAsync.get(
    `sp://core-show/v1/shows/${uriBase62}?responseFormat=protobufJson`
  );
  const availables = res.items.filter(
    (track) => track.episodePlayState.isPlayable
  );
  return availables.map((item) => item.episodeMetadata.link);
};

const fetchArtist = async (uri: string): Promise<string[]> => {
  const res = await Spicetify.CosmosAsync.get(
    `https://api-partner.spotify.com/pathfinder/v1/query?operationName=queryArtistOverview&variables=%7B%22uri%22%3A%22${uri}%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22433e28d1e949372d3ca3aa6c47975cff428b5dc37b12f5325d9213accadf770a%22%7D%7D`
  );
  return res.data.artist.discography.topTracks.items.map(
    (item) => item.track.uri
  );
};

const fetchDiscography = async (uri: string): Promise<string[]> => {
  Spicetify.showNotification(`Fetching albums list...`);
  const res = await Spicetify.CosmosAsync.get(
    `https://api-partner.spotify.com/pathfinder/v1/query?operationName=queryArtistOverview&variables=%7B%22uri%22%3A%22${uri}%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22433e28d1e949372d3ca3aa6c47975cff428b5dc37b12f5325d9213accadf770a%22%7D%7D`
  );
  let albums = res.data.artist.discography.albums.items.map(
    (items) => items.releases.items[0].uri
  );
  const tracks = [];
  for (const album of albums) {
    tracks.push(...(await fetchAlbum(album)));
  }
  return tracks;
};

// From: https://bost.ocks.org/mike/shuffle/
export function shuffle(array: string[]): string[] {
  let counter = array.length;
  if (counter <= 1) return array;

  const first = array[0];

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    let index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    let temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  // Re-shuffle if first item is the same as pre-shuffled first item
  while (array[0] === first) {
    array = shuffle(array);
  }
  return array;
}

// Text of notification when queue is shuffled successfully
const NOTIFICATION_TEXT = (count: number) => `Shuffled ${count} items!`;

function success(total: number) {
  Spicetify.showNotification(NOTIFICATION_TEXT(total));
}

/**
 * Replace queue and play first track immediately.
 * @param {string[]} list
 */
export async function playList(list: string[], context) {
  if (list[0] === 'playedstation') {
    return;
  }
  const count = list.length;
  if (count === 0) {
    throw 'There is no available track to play';
  } else if (count === 1) {
    Spicetify.Platform.PlayerAPI.play(
      { uri: list[0] },
      { featureVersion: Spicetify.Platform.PlayerAPI._defaultFeatureVersion }
    );
    return;
  }
  list.push('spotify:delimiter');

  Spicetify.Platform.PlayerAPI.clearQueue();

  const isQueue = !context;

  await Spicetify.CosmosAsync.put('sp://player/v2/main/queue', {
    queue_revision: Spicetify.Queue?.queueRevision,
    next_tracks: list.map((uri) => ({
      uri,
      provider: isQueue ? 'queue' : 'context',
      metadata: {
        is_queued: isQueue,
      },
    })),
    prev_tracks: Spicetify.Queue?.prevTracks,
  });

  if (!isQueue) {
    await Spicetify.CosmosAsync.post('sp://player/v2/main/update', {
      context: {
        uri: context,
        url: 'context://' + context,
      },
    });
  }

  success(count);
  // We don't want it to start playing immediately after queueing up
  // Spicetify.Player.next();
}

export function fetchAndPlay(uri: string) {
  fetchListFromUri(uri)
    .then((list) => playList(shuffle(list), uri))
    .catch((err) => Spicetify.showNotification(err));
}

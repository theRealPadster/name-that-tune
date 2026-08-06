export type TrackSuggestion = {
  uri: string;
  title: string;
  artist: string;
};

type SearchArtist = {
  profile?: {
    name?: string;
  };
};

type SearchTrack = {
  __typename?: string;
  uri?: string;
  name?: string;
  artists?: {
    items?: SearchArtist[];
  };
  playability?: {
    playable?: boolean;
  };
};

type SearchResultItem = {
  item?: {
    __typename?: string;
    data?: SearchTrack;
  };
};

type SearchSuggestionsResponse = {
  data?: {
    searchV2?: {
      topResultsV2?: {
        itemsV2?: SearchResultItem[];
      };
    };
  };
  errors?: unknown[];
};

export const searchTracks = async (
  query: string,
): Promise<TrackSuggestion[]> => {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) return [];

  const response = await Spicetify.GraphQL.Request(
    Spicetify.GraphQL.Definitions.searchSuggestions,
    {
      query: trimmedQuery,
      limit: 30,
      numberOfTopResults: 30,
      offset: 0,
      includeAuthors: true,
      includeAlbumPreReleases: true,
      includeEpisodeContentRatingsV2: true,
    },
  ) as SearchSuggestionsResponse;

  if (response.errors?.length) {
    throw new Error('Spotify returned an error while searching');
  }

  const results =
    response.data?.searchV2?.topResultsV2?.itemsV2 ?? [];

  const suggestions: TrackSuggestion[] = [];
  const seenUris = new Set<string>();

  for (const result of results) {
    if (result.item?.__typename !== 'TrackResponseWrapper') continue;

    const track = result.item.data;

    if (
      track?.__typename !== 'Track'
      || !track.uri?.startsWith('spotify:track:')
      || !track.name
      || track.playability?.playable === false
      || seenUris.has(track.uri)
    ) {
      continue;
    }

    seenUris.add(track.uri);

    const artist = (track.artists?.items ?? [])
      .map((item) => item.profile?.name)
      .filter((name): name is string => Boolean(name))
      .join(', ');

    suggestions.push({
      uri: track.uri,
      title: track.name,
      artist,
    });

    if (suggestions.length === 8) break;
  }

  return suggestions;
};
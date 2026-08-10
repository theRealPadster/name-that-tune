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

// Spotify's GraphQL definitions are private, undocumented, and get renamed or
// dropped between client releases, so fall back through the operations we know
// of. Both are persisted queries, so the variables have to match exactly what
// the server expects for that operation -- hence a builder per entry rather
// than one shared variable object.
//
// Verified against Spotify 1.2.94.583 over the CEF debugger. Both return
// data.searchV2.topResultsV2.itemsV2, and both give us uri, name, and
// artists.items[].profile.name on a Track. searchModalResults does not select
// playability, so on that path unplayable tracks are not filtered out.
const SEARCH_DEFINITIONS = [
  {
    // What the desktop client's own search box uses.
    name: 'searchSuggestions',
    variables: (query: string) => ({
      query,
      limit: 30,
      numberOfTopResults: 30,
      offset: 0,
      includeAuthors: true,
      includeAlbumPreReleases: true,
      includeEpisodeContentRatingsV2: true,
    }),
  },
  {
    // Backs the quick-search modal. Note it takes searchTerm, not query.
    name: 'searchModalResults',
    variables: (query: string) => ({
      searchTerm: query,
      limit: 30,
      numberOfTopResults: 30,
      offset: 0,
      includeAudiobooks: true,
      includeAuthors: true,
      includePreRelease: true,
      includeArtistHasConcertsField: false,
    }),
  },
];

type SearchDefinition = (typeof SEARCH_DEFINITIONS)[number];

let resolved: { definition: unknown, entry: SearchDefinition } | undefined;
let missingDefinitionLogged = false;

// Resolved lazily rather than at module scope, since the definitions are only
// populated once Spotify's own bundle has loaded. A failed lookup is retried on
// the next keystroke, but only complains the once.
const getSearchDefinition = () => {
  if (resolved) return resolved;

  const definitions = Spicetify.GraphQL?.Definitions ?? {};

  for (const entry of SEARCH_DEFINITIONS) {
    const definition = definitions[entry.name];
    if (definition) {
      resolved = { definition, entry };
      return resolved;
    }
  }

  if (!missingDefinitionLogged) {
    missingDefinitionLogged = true;
    console.error(
      'Song suggestions are unavailable: Spotify exposes none of the search '
      + `definitions we know about (${SEARCH_DEFINITIONS.map((d) => d.name).join(', ')}).`,
    );
  }

  return undefined;
};

export const searchTracks = async (
  query: string,
): Promise<TrackSuggestion[]> => {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) return [];

  const search = getSearchDefinition();

  if (!search) {
    return [];
  }

  const response = await Spicetify.GraphQL.Request(
    search.definition,
    search.entry.variables(trimmedQuery),
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

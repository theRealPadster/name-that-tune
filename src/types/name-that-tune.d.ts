// TODO: Do I bother saving the song info at all, or just increment the count for each step?
export type SavedStats = {
  // e.g. number of seconds : number of times it took that long to be guessed
  // e.g. { 1: 0, 2: 3, 4: 8, 7: 8, 11: 9, 16: 12 }
  [key: number]: number;
};

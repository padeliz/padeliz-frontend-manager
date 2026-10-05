/** Shared event/schedule/lottery fixtures for Manager tests */

export const nestedMatchesByCourt = [
  [
    { side_a: [1, 2], side_b: [3, 4], court_name: 'Court A' },
    { side_a: [5, 6], side_b: [7, 8], court_name: 'Court A' },
  ],
  [{ side_a: [9, 10], side_b: [11, 12], court_name: 'Court B' }],
];

export const posterRowFixture = {
  id_event_division_poster: 42,
  poster_kind: 'MATCHES' as const,
  event_division_court_id: 77,
  generated_url: 'https://example.com/generated.pdf',
  printed_url: null as string | null,
};

export const lotteryLivePendingFixture = {
  status: 'pending',
  lucky: {
    id_lucky: 5,
    seconds_left: 0,
    announced_at: null as string | number | null,
    player: { name: 'Winner' },
    prize: {
      name: 'Racket',
      media_url: 'https://example.com/prize.mp4',
      is_video: true,
    },
  },
  accepted: [] as unknown[],
};

export const lotteryBoardFixture = {
  logo: '/media/lottery/minitour-long-e.png',
  background: '/media/lottery/padel-balls.jpg',
  intervals: [],
};

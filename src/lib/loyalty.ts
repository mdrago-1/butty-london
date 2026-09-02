/** Buy 9 sandwiches, the 10th is free. Drinks don't count. */
export const STAMPS_FOR_REWARD = 9;

export function stampProgress(stamps: number) {
  const s = Math.max(0, Math.round(stamps) || 0);
  const rewardsReady = Math.floor(s / STAMPS_FOR_REWARD);
  const toward = s % STAMPS_FOR_REWARD;
  const canRedeem = s >= STAMPS_FOR_REWARD;
  return {
    stamps: s,
    card: canRedeem ? STAMPS_FOR_REWARD : toward,
    canRedeem,
    remainingToReward: canRedeem ? 0 : STAMPS_FOR_REWARD - toward,
    rewardsReady,
  };
}

export type LoyaltyEvent = {
  id: number;
  kind: string;
  points: number;
  note: string;
  at: number;
};

export type LoyaltyProfile = {
  displayName: string;
  email: string | null;
  optedIn: boolean;
  stamps: number;
  card: number;
  canRedeem: boolean;
  remainingToReward: number;
  rewardsReady: number;
  events: LoyaltyEvent[];
};

export type ClubMember = {
  userId: string;
  displayName: string;
  email: string | null;
  stamps: number;
  card: number;
  canRedeem: boolean;
  optedIn: boolean;
};

import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

export interface CoinTransaction {
  id: string;
  user_id: string;
  order_id?: string;
  type: 'EARN' | 'REDEEM' | 'REFUND' | 'EXPIRE' | 'ADJUSTMENT';
  coins: number;
  description?: string;
  created_at: string;
}

export interface RewardSettings {
  reward_system_enabled: boolean;
  spend_per_coin: number;
  coins_per_rupee: number;
  max_redemption_percentage: number;
  welcome_coins?: number;
  first_order_coins?: number;
  credit_delay_hours?: number;
  credit_delay_days?: number;
  credit_delay_minutes?: number;
}

export interface UserWallet {
  id: string;
  user_id: string;
  coin_balance: number;
  available_coins?: number;
  pending_coins?: number;
  rupee_value: number;
  settings: RewardSettings;
  recent_transactions: CoinTransaction[];
}

export interface AdminCustomerRewardStat {
  user_id: string;
  customer_name: string;
  customer_email: string;
  available_coins: number;
  pending_coins: number;
  total_coins_earned: number;
  total_coins_redeemed: number;
  total_coins_returned: number;
  total_coins_reversed: number;
  first_order_bonus_status: string;
}

export interface AdminCoinTransactionItem {
  id: string;
  customer_name: string;
  customer_email: string;
  coins: number;
  transaction_type: string;
  status: string;
  reason: string;
  order_id?: string;
  created_at: string;
  available_at?: string;
}

export interface CalculateRedemptionRequest {
  subtotal: number;
  coupon_discount?: number;
  coins_to_use?: number;
}

export interface CalculateRedemptionResponse {
  user_balance: number;
  coins_requested: number;
  allowed_coins: number;
  coin_discount: number;
  max_usable_coins: number;
  max_coin_discount: number;
  message: string;
}

export interface PaginatedTransactions {
  items: CoinTransaction[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export const walletService = {
  getWallet: (): Promise<UserWallet> =>
    apiGet<UserWallet>('/wallet'),

  getPaginatedTransactions: (type = 'ALL', page = 1, limit = 10): Promise<PaginatedTransactions> =>
    apiGet<PaginatedTransactions>(`/wallet/transactions?type=${type}&page=${page}&limit=${limit}`),

  getTransactions: async (limit = 50, offset = 0): Promise<CoinTransaction[]> => {
    const res = await apiGet<any>(`/wallet/transactions?limit=${limit}&offset=${offset}`);
    return Array.isArray(res) ? res : res.items || [];
  },

  calculateRedemption: (payload: CalculateRedemptionRequest): Promise<CalculateRedemptionResponse> =>
    apiPost<CalculateRedemptionResponse>('/wallet/calculate-redemption', payload),

  getRewardSettings: (): Promise<RewardSettings> =>
    apiGet<RewardSettings>('/admin/rewards/settings'),

  updateRewardSettings: (settings: RewardSettings): Promise<RewardSettings> =>
    apiPut<RewardSettings>('/admin/rewards/settings', settings),

  adminGetCustomerRewards: (): Promise<AdminCustomerRewardStat[]> =>
    apiGet<AdminCustomerRewardStat[]>('/admin/rewards/customers'),

  adminGetCoinTransactions: (type = 'ALL'): Promise<AdminCoinTransactionItem[]> =>
    apiGet<AdminCoinTransactionItem[]>(`/admin/rewards/transactions?type_filter=${type}`),

  adminDeleteCustomerRewards: (userIds: string[]): Promise<{ deleted_count: number; message: string }> =>
    apiDelete<{ deleted_count: number; message: string }>('/admin/rewards/customers', { user_ids: userIds }),
};

import type { Account } from '@/api/types'

export const ACCOUNT_TYPE_LABEL: Record<Account['type'], string> = { checking: 'Checking', savings: 'Savings', treasury: 'Treasury' }

/** "Operating ••4821" */
export const accountLabel = (a: Pick<Account, 'name' | 'mask'>) => `${a.name} ••${a.mask}`

export function accountLabelById(accounts: Account[] | undefined, id: string) {
  const a = accounts?.find((x) => x.id === id)
  return a ? accountLabel(a) : '—'
}

/**
 * The coin mark used next to balances and prices. (The 🪙 emoji is avoided
 * because older emoji fonts, for example Windows 10, render it as an empty box.)
 */
export function CoinIcon() {
  return <span aria-hidden="true" className="coin-icon">💰</span>
}

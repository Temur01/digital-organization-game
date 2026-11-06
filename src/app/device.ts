/** Kuchsiz qurilma: kichik ekran, kam yadro yoki kam xotira — qimmat effektlar boshidanoq o‘chiriladi. */
export function isLowPowerDevice(): boolean {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return window.innerWidth < 700 || (navigator.hardwareConcurrency ?? 8) <= 4 || (memory !== undefined && memory <= 4);
}

/**
 * Tashkilotga moslash uchun yagona joy (build vaqtida).
 * Domenlar RFC 2606 bo‘yicha faqat `.example` zonasidan bo‘lishi shart.
 */
export const companyConfig = {
  gameTitle: 'Raqamli Qalqon',
  name: 'Kompaniya',
  domain: 'kompaniya.example',
  phishingDomain: 'kompaniya-tolov.example',
  itPhone: '93499',
  reportButton: 'Fishingni xabar qilish',
  /** Kirmagan o‘yinchi shu ism va kasb bilan ko‘rinadi; ro‘yxatdan o‘tish formasi ham shu qiymatlar bilan to‘ldiriladi */
  defaultPlayer: { firstName: 'Bek', position: 'Dasturchi' },
  /** Ro‘yxatdan o‘tish va profil formalaridagi «Kasb» ro‘yxati */
  positions: [
    { value: 'Dasturchi', icon: '💻' },
    { value: 'Tizim administratori', icon: '🖥️' },
    { value: 'Axborot xavfsizligi mutaxassisi', icon: '🛡️' },
    { value: 'Buxgalter', icon: '🧾' },
    { value: 'Iqtisodchi', icon: '📈' },
    { value: 'Yurist', icon: '⚖️' },
    { value: 'Kadrlar bo‘limi mutaxassisi', icon: '🤝' },
    { value: 'Menejer', icon: '📋' },
    { value: 'Rahbar', icon: '👔' },
    { value: 'Ofis xodimi', icon: '🗂️' },
    { value: 'Boshqa', icon: '✨' },
  ],
} as const;

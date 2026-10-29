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
  /** Kirmagan o‘yinchi shu ism bilan ko‘rinadi; ro‘yxatdan o‘tish formasi ham shu qiymatlar bilan to‘ldiriladi */
  defaultPlayer: { firstName: 'Temur', lastName: 'Suvonov', age: 25, department: 'AKT', position: 'dasturchi' },
} as const;

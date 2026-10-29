/**
 * Tashkilotga moslash uchun yagona joy (build vaqtida).
 * Domenlar RFC 2606 bo‘yicha faqat `.example` zonasidan bo‘lishi shart.
 */
export const companyConfig = {
  gameTitle: 'Raqamli Qalqon',
  name: 'Kompaniya',
  domain: 'kompaniya.example',
  phishingDomain: 'kompaniya-tolov.example',
  itPhone: '1234',
  reportButton: 'Fishingni xabar qilish',
} as const;

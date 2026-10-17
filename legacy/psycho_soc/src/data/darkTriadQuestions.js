/**
 * Вопросы для теста "Темная триада" (SD3)
 * Short Dark Triad — 27 вопросов, шкалы M (макиавеллизм), N (нарциссизм), P (психопатия)
 * 
 * Для редактирования: меняйте текст, scale (M/N/P), reversed
 * id менять нельзя — они используются для сохранения ответов
 */

const darkTriadQuestions = [
  // — Макиавеллизм (M) —
  { id: 'dt_1',  text: 'Лучше не говорить о своих истинных намерениях',             scale: 'M', reversed: false },
  { id: 'dt_2',  text: 'Лесть — хороший способ добиться своего',                    scale: 'M', reversed: false },
  { id: 'dt_3',  text: 'Я умею использовать других для достижения целей',            scale: 'M', reversed: false },
  { id: 'dt_4',  text: 'Я считаю, что цель оправдывает средства',                     scale: 'M', reversed: false },
  { id: 'dt_5',  text: 'Мне комфортно манипулировать людьми',                        scale: 'M', reversed: false },
  { id: 'dt_6',  text: 'Я планирую свои действия наперед, чтобы получить выгоду',    scale: 'M', reversed: false },
  { id: 'dt_7',  text: 'Мне нравится, когда от меня зависят',                        scale: 'M', reversed: false },
  { id: 'dt_8',  text: 'Я избегаю прямых конфликтов, действуя через других',         scale: 'M', reversed: false },
  { id: 'dt_9',  text: 'Люди сами виноваты, если их используют',                     scale: 'M', reversed: false },

  // — Нарциссизм (N) —
  { id: 'dt_10', text: 'Я — прирожденный лидер',                                     scale: 'N', reversed: false },
  { id: 'dt_11', text: 'Я заслуживаю особого отношения',                              scale: 'N', reversed: false },
  { id: 'dt_12', text: 'Люди часто завидуют моим успехам',                            scale: 'N', reversed: false },
  { id: 'dt_13', text: 'Мне нравится быть в центре внимания',                         scale: 'N', reversed: false },
  { id: 'dt_14', text: 'Я знаю, что я особенный(ая)',                                 scale: 'N', reversed: false },
  { id: 'dt_15', text: 'Я скорее лидер, чем последователь',                           scale: 'N', reversed: false },
  { id: 'dt_16', text: 'Я часто чувствую, что меня недооценивают',                    scale: 'N', reversed: false },
  { id: 'dt_17', text: 'Мне нравится, когда мной восхищаются',                        scale: 'N', reversed: false },
  { id: 'dt_18', text: 'Я склонен(на) преувеличивать свои достижения',                scale: 'N', reversed: false },

  // — Психопатия (P) —
  { id: 'dt_19', text: 'Мне легко даются авантюры и рискованные поступки',            scale: 'P', reversed: false },
  { id: 'dt_20', text: 'Я не чувствую вины за свои поступки',                         scale: 'P', reversed: false },
  { id: 'dt_21', text: 'Я предпочитаю жить одним днем',                               scale: 'P', reversed: false },
  { id: 'dt_22', text: 'Мне скучно от обычной жизни',                                 scale: 'P', reversed: false },
  { id: 'dt_23', text: 'Я могу быть жестоким(ой), если это необходимо',               scale: 'P', reversed: false },
  { id: 'dt_24', text: 'Меня не волнуют чувства других',                              scale: 'P', reversed: false },
  { id: 'dt_25', text: 'Я часто действую импульсивно',                                scale: 'P', reversed: false },
  { id: 'dt_26', text: 'Мне нравится нарушать правила',                               scale: 'P', reversed: false },
  { id: 'dt_27', text: 'Я легко выхожу из себя и могу быть агрессивным(ой)',          scale: 'P', reversed: false },
];

export default darkTriadQuestions;
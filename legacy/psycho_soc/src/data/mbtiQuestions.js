/**
 * Вопросы для теста MBTI на основе когнитивных функций Юнга
 * 20 вопросов по 4 дихотомиям: EI, SN, TF, JP
 * 
 * Для редактирования: меняйте текст, scale (EI/SN/TF/JP), reversed
 * id менять нельзя
 */

const mbtiQuestions = [
  // — Экстраверсия (E) vs Интроверсия (I) —
  { id: 'mbti_1',  text: 'Я заряжаюсь энергией от общения с людьми',                  scale: 'EI', reversed: false },
  { id: 'mbti_2',  text: 'Я предпочитаю проводить время в одиночестве',               scale: 'EI', reversed: true },
  { id: 'mbti_3',  text: 'В компании я становлюсь активнее и разговорчивее',          scale: 'EI', reversed: false },
  { id: 'mbti_4',  text: 'Мне нужно время наедине с собой, чтобы восстановить силы',  scale: 'EI', reversed: true },

  // — Сенсорика (S) vs Интуиция (N) —
  { id: 'mbti_5',  text: 'Я обращаю внимание на конкретные факты и детали',           scale: 'SN', reversed: false },
  { id: 'mbti_6',  text: 'Я часто думаю о возможностях и абстрактных идеях',          scale: 'SN', reversed: true },
  { id: 'mbti_7',  text: 'Мне важно, что работает здесь и сейчас',                    scale: 'SN', reversed: false },
  { id: 'mbti_8',  text: 'Я увлекаюсь теориями и концепциями',                        scale: 'SN', reversed: true },
  { id: 'mbti_9',  text: 'Я доверяю своему опыту и проверенным фактам',               scale: 'SN', reversed: false },

  // — Мышление (T) vs Чувство (F) —
  { id: 'mbti_10', text: 'Я принимаю решения на основе логики и анализа',             scale: 'TF', reversed: false },
  { id: 'mbti_11', text: 'Для меня важны гармония и чувства других людей',            scale: 'TF', reversed: true },
  { id: 'mbti_12', text: 'Я ценю объективность больше, чем тактичность',              scale: 'TF', reversed: false },
  { id: 'mbti_13', text: 'Я легко ставлю себя на место другого человека',             scale: 'TF', reversed: true },
  { id: 'mbti_14', text: 'Справедливость для меня важнее сострадания',                scale: 'TF', reversed: false },

  // — Суждение (J) vs Восприятие (P) —
  { id: 'mbti_15', text: 'Я люблю планировать и следовать расписанию',                scale: 'JP', reversed: false },
  { id: 'mbti_16', text: 'Я предпочитаю действовать спонтанно',                       scale: 'JP', reversed: true },
  { id: 'mbti_17', text: 'Мне комфортно, когда всё организовано',                     scale: 'JP', reversed: false },
  { id: 'mbti_18', text: 'Я предпочитаю держать свои варианты открытыми',             scale: 'JP', reversed: true },
  { id: 'mbti_19', text: 'Я довожу начатое до конца, следуя плану',                   scale: 'JP', reversed: false },
  { id: 'mbti_20', text: 'Мне нравится импровизировать',                              scale: 'JP', reversed: true },
];

export default mbtiQuestions;
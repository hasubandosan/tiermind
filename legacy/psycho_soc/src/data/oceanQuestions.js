/**
 * Вопросы для теста "Большая пятерка" (OCEAN)
 * TIPI — Ten-Item Personality Inventory
 * 
 * Для редактирования: меняйте текст, scale (O/C/E/A/N), reversed (true/false)
 * Но не меняйте id — они используются для сохранения ответов
 */

const oceanQuestions = [
  { id: 'ocean_1',  text: 'Я открыт(а) новым идеям и опыту',                       scale: 'O', reversed: false },
  { id: 'ocean_2',  text: 'Я склонен(на) к беспорядку и неорганизованности',        scale: 'C', reversed: true },
  { id: 'ocean_3',  text: 'Я общителен(на) и энергичен(чна)',                      scale: 'E', reversed: false },
  { id: 'ocean_4',  text: 'Я склонен(на) критиковать других',                       scale: 'A', reversed: true },
  { id: 'ocean_5',  text: 'Я легко справляюсь со стрессом',                        scale: 'N', reversed: true },
  { id: 'ocean_6',  text: 'Я предпочитаю рутину и привычные вещи',                 scale: 'O', reversed: true },
  { id: 'ocean_7',  text: 'Я надежен(на) и дисциплинирован(на)',                   scale: 'C', reversed: false },
  { id: 'ocean_8',  text: 'Я предпочитаю уединение',                               scale: 'E', reversed: true },
  { id: 'ocean_9',  text: 'Я проявляю понимание к другим',                         scale: 'A', reversed: false },
  { id: 'ocean_10', text: 'Я часто испытываю тревогу',                             scale: 'N', reversed: false },
];

export default oceanQuestions;
import { WebClient } from '@slack/web-api';
import schedule from 'node-schedule';
import moment from 'moment';
import slack from './slack-key.js'

const web = new WebClient(slack.bot_token);

const days = ['일', '월', '화', '수', '목', '금', '토'];

const rand = (max) => {
  return Math.floor(Math.random() * (max - 1));
}

const log = {
  error: (msg) => {
    let date = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    console.error(`#error::${date} ${days[moment().day()]}요일 [ ${msg} ]`);
  },
  info: (msg) => {
    let date = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    console.log(`#info::${date} ${days[moment().day()]}요일 [ ${msg} ]`);
  }
};

const list = [
  { location: '신송빌딩', far: 389, name: '돈대리돈까스백반', category: '한식돈까스' },
  { location: '신영증권', far: 796, name: '하카타분코', category: '라멘' },
  { location: '여의도백화점', far: 698, name: '양푼집 흑돼지김치찌개', category: '김치찌개' },
  { location: 'KTB빌딩', far: 330, name: '오한수 우육면가', category: '우육면' },
  { location: '신송빌딩', far: 389, name: '지리산명가', category: '백반' },
  { location: '신송빌딩', far: 389, name: '사계절집밥', category: '백반' },
  { location: '대오빌딩', far: 435, name: '명동칼국수', category: '칼국수' },
  { location: '대오빌딩', far: 435, name: '대문집', category: '한식' },
  { location: '유성빌딩', far: 844, name: '청키면가', category: '완탕면' },
  { location: 'IFC', far: 177, name: 'CJ더마켓', category: '샐러드' },
  { location: 'IFC', far: 108, name: '맥도날드', category: '햄버거' },
  { location: 'IFC', far: 108, name: '판다익스프레스', category: '중식' },
  { location: '신송빌딩', far: 389, name: '다다미생선구이', category: '생선구이' },
  { location: 'KTB빌딩', far: 330, name: '오늘은분식', category: '분식' },
  { location: 'BNK금융타워', far: 261, name: '진순대', category: '순대국' },
  { location: '여의도백화점', far: 698, name: '보글보글부대찌개', category: '부대찌개' },
  { location: '동화빌딩', far: 288, name: '더차이니스', category: '중식' },
  { location: '율촌빌딩', far: 290, name: '바스버거', category: '햄버거' },
  { location: '메리츠화재여의도사옥', far: 293, name: '사보텐', category: '일식돈까스우동' },
  { location: '씨티플라자', far: 252, name: '완백부대찌개', category: '부대찌개' },
];

let lastNumbers = [];

const getLastNumbers = async () => {
  lastNumbers = [];
  const history = await getHistory();
  const filter = history.messages.filter((r) => r.bot_id === 'B03HCCTV6J1')
    .slice(0, 10).reduce((acc, r) => {
      acc.push(r.text.split('\n')[1].split(' / ')[0]);
      return acc;
    }, []);
  list.forEach((r, i) => {
    if (filter.indexOf(r.name) !== -1) lastNumbers.push(i);  
  })
}

const getNumber = () => {
  const num = rand(list.length);
  if (lastNumbers.indexOf(num) !== -1) return getNumber();
  return num;
}
const getMenu = async () => {
  await getLastNumbers();
  const num = await getNumber();
  return list[num];
}

const getHistory = async () => {
  const history = await web.conversations.history({
    channel: 'C03HF9FFBDZ',
  });
  console.log(history);
  return history;
}

const scheduledr = schedule.scheduleJob('0 0 11 * * MON-FRI', async () => {
  const menu = await getMenu();
  const date = `${moment(new Date()).format('MM월 DD일')} ${days[moment().day()]}요일`;
  web.chat.postMessage({
    channel: 'C03HF9FFBDZ',
    text: `${date} 추천 메뉴는 '${menu.category}' 입니다.\n${menu.name} / ${menu.location}(${menu.far}m)`,
    as_user: true
  });
  log.info(`${menu.name} / ${menu.category} / ${menu.location}(${menu.far})`);
});

// getHistory();

// web.chat.delete({
//   ts: '1656563159.505299',
//   channel: 'C03HF9FFBDZ',
// })

// const menu = list[17];
// const date = `${moment(new Date()).format('MM월 DD일')} ${days[moment().day()]}요일`;
// web.chat.postMessage({
//   channel: 'C03HF9FFBDZ',
//   text: `${date} 추천 메뉴는 '${menu.category}' 입니다.\n${menu.name} / ${menu.location}(${menu.far}m)`,
//   as_user: true
// });
// log.info(`${menu.name} / ${menu.category} / ${menu.location}(${menu.far})`);
import { WebClient } from '@slack/web-api';
import schedule from 'node-schedule';
import moment from 'moment';
import cheerio from 'cheerio';
import axios from "axios";
import keys from './slack-key.js';

const web = new WebClient(keys.stock);

const days = ['일', '월', '화', '수', '목', '금', '토'];

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

const priceToString = (price) => {
  return `${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}원`;
}; 

const data = [
  {
    name: 'CMA계좌',
    stocks: [
      {
        code: '005930',
        name: '삼성전자',
        average: 72500,
        cnt: 20,
      },
      {
        code: '005930',
        name: '삼성전자(고모)',
        average: 57500,
        cnt: 18,
      },
    ]
  },
  {
    name: '연금저축계좌',
    stocks: [
      {
        code: '133690',
        name: 'TIGER 미국나스닥100',
        average: 67425,
        cnt: 100,
      },
      {
        code: '360750',
        name: 'TIGER 미국S&P500',
        average: 11485,
        cnt: 545,
      },
    ]
  },
]
const getPresentPrice = async (code) => {
  try {
    const html = await axios.get(`https://finance.naver.com/item/main.naver?code=${code}`);
    const $ = cheerio.load(html.data);
    const price = $('#chart_area > div.rate_info > div.today > p.no_today > em').text().replaceAll(/^\s+|\s+$/gm,'').split('\n')[0].replaceAll(',', '');
    return Number(price);
  } catch (error) {
    console.error(error);
    log.error('크롤링 에러');
  }
};

const sendMsg = async () => {
  let msg = '';
  let logMsg = '';
  for (let i = 0; i < data.length; i += 1) {
    let total_my = 0;
    let total_now = 0;
    for (let j = 0; j < data[i].stocks.length; j += 1) {
      data[i].stocks[j]['price'] = await getPresentPrice(data[i].stocks[j].code);
      data[i].stocks[j]['total_now'] = data[i].stocks[j].price * data[i].stocks[j].cnt;
      data[i].stocks[j]['total_my'] = data[i].stocks[j].average * data[i].stocks[j].cnt;
      data[i].stocks[j]['total_diff'] = (data[i].stocks[j].price * data[i].stocks[j].cnt) - (data[i].stocks[j].average * data[i].stocks[j].cnt);
      data[i].stocks[j]['total_per'] = Number((((data[i].stocks[j].price * data[i].stocks[j].cnt) - (data[i].stocks[j].average * data[i].stocks[j].cnt)) / (data[i].stocks[j].average * data[i].stocks[j].cnt) * 100).toFixed(2));

      const stock = {...data[i].stocks[j]}
      msg += `*[${stock.code}] ${stock.name}*\n
평균매입가: ${priceToString(stock.average)} (${stock.cnt}주)\n
현재가: ${priceToString(stock.price)}\n
평가손익: ${priceToString(stock.total_diff)} *${stock.total_per}%*\n
------------------------------------------------------------------\n`

      total_my += stock.total_my;
      total_now += stock.total_now;

      if (j === data[i].stocks.length - 1) {
        msg += `*${data[i].name}*\n
총평가금액: ${priceToString(total_now)}\n
총평가손익: ${priceToString((total_now - total_my))} *${Number(((total_now - total_my) / total_my * 100).toFixed(2))}%*\n
------------------------------------------------------------------\n`;
        logMsg += `${data[i].name}: ${Number(((total_now - total_my) / total_my * 100).toFixed(2))}% `;
      }
    }
  }
  try {
    msg += '`' + moment().format(`YYYY-MM-DD ${days[moment().day()]}요일 HH:mm:ss`) + '`\n';
    await web.chat.postMessage({
      channel: 'C03J0ER84EQ',
      text: msg,
      as_user: true
    });
    log.info(logMsg);
  } catch (error) {
    console.log(error);
    log.error('슬랙 메시지 전송 에러')
  }
}

const scheduledr = schedule.scheduleJob('0 0 9-16 * * MON-FRI', async () => {
  sendMsg();
});

sendMsg();
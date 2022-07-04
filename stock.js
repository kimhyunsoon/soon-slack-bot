import { WebClient } from '@slack/web-api';
import schedule from 'node-schedule';
import moment from 'moment';
import cheerio from 'cheerio';
import axios from "axios";
import slack from './slack-key.js';
import ChartJSImage from 'chart.js-image';
import { createReadStream } from 'fs';

const web = new WebClient(slack.stock.bot_token);

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
      channel: slack.stock.channel,
      text: msg,
      as_user: true
    });
    log.info(logMsg);
  } catch (error) {
    console.log(error);
    log.error('슬랙 메시지 전송 에러')
  }
}

const getHistory = async () => {
  const history = await web.conversations.history({
    channel: slack.stock.channel,
  });
  return history;
}
const makeChart = async () => {
  try {
    const history = await getHistory();
    const filterMessages = history.messages.filter((r) => r.text.indexOf('--------------------------------') != -1)
      .filter((r, i) =>  i <= 40).map((r) => r.text).reverse();
  
    const samsung_aunt = [
      {
        label: '현재가',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#1976D2', 
        data: [],
      },
      {
        label: '평균매입가',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#000000',
        data: []
      },
    ];
    const samsung = [
      {
        label: '현재가',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#1976D2', 
        data: [],
      },
      {
        label: '평균매입가',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#000000',
        data: []
      },
    ];
    const nasdaq = [
      {
        label: '현재가',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#1976D2', 
        data: [],
      },
      {
        label: '평균매입가',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#000000',
        data: []
      },
    ];
    const snp = [
      {
        label: '현재가',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#1976D2', 
        data: [],
      },
      {
        label: '평균매입가',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#000000',
        data: []
      },
    ];
    const date = [];
  
    let samsung_aunt_amount = '';
    let samsung_amount = '';
    let nasdaq_amount = '';
    let snp_amount = '';
  
    const getNowPrice = (r, splitStr) => {
      return Number(r.split(splitStr)[1].split('평가손익:')[0].split('현재가:')[1].split('원')[0].trim().replace(',', ''));
    }
    const getAmountPer = (r, splitStr) => {
      return r.split(splitStr)[1].split('--------')[0].split('평가손익:')[1].split('----')[0].split('*')[1].trim().replaceAll('*', '');
    }
  
    for (let i = 0; i < filterMessages.length; i += 1) {
      const r = filterMessages[i];
      const time = `${r.split('`')[1].slice(5, -6).replace('-', '/').replace('요일', '')}시`;
      const now_aunt = getNowPrice(r, '삼성전자(고모)');
      const now_samsung = getNowPrice(r, '삼성전자*');
      const now_nasdaq = getNowPrice(r, '나스닥100*');
      const now_snp = getNowPrice(r, 'P500*');
  
    
  
      if (i === filterMessages.length - 1) {
        const amount_aunt = getAmountPer(r, '삼성전자(고모)');
        const amount_samsung = getAmountPer(r, '삼성전자*');
        const amount_nasdaq = getAmountPer(r, '나스닥100*');
        const amount_snp = getAmountPer(r, 'P500*');
        samsung_aunt_amount = amount_aunt;
        samsung_amount = amount_samsung;
        nasdaq_amount = amount_nasdaq;
        snp_amount = amount_snp;
      }
  
      date.push(time);
  
      samsung_aunt[1].data.push(data[0].stocks[1].average);
      samsung_aunt[0].data.push(now_aunt);
  
      samsung[1].data.push(data[0].stocks[0].average);
      samsung[0].data.push(now_samsung);
  
      nasdaq[1].data.push(data[1].stocks[0].average);
      nasdaq[0].data.push(now_nasdaq);
  
      snp[1].data.push(data[1].stocks[1].average);
      snp[0].data.push(now_snp);
    }
  
    const aunt_chart = await ChartJSImage().chart({
      type: 'line',
      data: {
        labels: date,
        datasets: samsung_aunt,
      },
      options: {
        title: {
          display: true,
          text: `삼성전자(고모) (현재 수익률: ${samsung_aunt_amount})`,
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                display: true,
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                display: true,
              }
            }
          ]
        }
      }
    }).backgroundColor('white').width(700).height(500);
    const samsung_chart = await ChartJSImage().chart({
      type: 'line',
      data: {
        labels: date,
        datasets: samsung,
      },
      options: {
        title: {
          display: true,
          text: `삼성전자 (현재 수익률: ${samsung_amount})`,
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                display: true,
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                display: true,
              }
            }
          ]
        }
      }
    }).backgroundColor('white').width(700).height(500);
    const nasdaq_chart = await ChartJSImage().chart({
      type: 'line',
      data: {
        labels: date,
        datasets: nasdaq,
      },
      options: {
        title: {
          display: true,
          text: `나스닥 (현재 수익률: ${nasdaq_amount})`,
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                display: true,
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                display: true,
              }
            }
          ]
        }
      }
    }).backgroundColor('white').width(700).height(500);
    const snp_chart = await ChartJSImage().chart({
      type: 'line',
      data: {
        labels: date,
        datasets: snp,
      },
      options: {
        title: {
          display: true,
          text: `S&P500 (현재 수익률: ${snp_amount})`,
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                display: true,
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                display: true,
              }
            }
          ]
        }
      }
    }).backgroundColor('white').width(700).height(500);
  
    aunt_chart.toFile('./chart/aunt.png');
    samsung_chart.toFile('./chart/samung.png');
    nasdaq_chart.toFile('./chart/nasdap.png');
    snp_chart.toFile('./chart/snp.png');
    log.info('MAKE CHART SUCCESS');
  } catch (error) {
    log.error('MAKE CHART ERROR');
    console.log(error);
  }
}

const sendChart = async () => {
  try {
    await web.files.upload({
      channels: slack.stock.channel,
      token: slack.stock.bot_token,
      file: createReadStream('./chart/aunt.png'),
      filename: 'aunt.png',
    });
    await web.files.upload({
      channels: slack.stock.channel,
      token: slack.stock.bot_token,
      file: createReadStream('./chart/samung.png'),
      filename: 'samung.png',
    });
    await web.files.upload({
      channels: slack.stock.channel,
      token: slack.stock.bot_token,
      file: createReadStream('./chart/nasdap.png'),
      filename: 'nasdap.png',
    });
    await web.files.upload({
      channels: slack.stock.channel,
      token: slack.stock.bot_token,
      file: createReadStream('./chart/snp.png'),
      filename: 'snp.png',
    });
    log.info('SEND CHART SUCCESS');
  } catch (error) {
    log.error('SEND CHART ERROR');
    console.log(error);
  }
}

const sendMsgWork = schedule.scheduleJob('0 0 9-16 * * MON-FRI', async () => {
  sendMsg();
});
const makeChartWork = schedule.scheduleJob('0 1 16 * * FRI', async () => {
  makeChart();
});
const sendChartWork = schedule.scheduleJob('0 2 16 * * FRI', async () => {
  sendChart();
});

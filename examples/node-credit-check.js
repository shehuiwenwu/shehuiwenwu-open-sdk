/**
 * 示例：查一家企业的文物资质 + 工商信息 + 信用评分
 *
 * 运行：RELICS_API_KEY=你的密钥 node examples/node-credit-check.js "北京中博国际拍卖有限公司"
 */
const { Client, ShehuiwenwuError } = require('../sdk/node');

const company = process.argv[2] || '北京中博国际拍卖有限公司';

(async () => {
  const client = new Client({ apiKey: process.env.RELICS_API_KEY || '' });

  try {
    const qual = await client.creditQual({ company });
    console.log('【文物资质】', JSON.stringify(qual.data && qual.data.item, null, 2));

    const biz = await client.creditBiz({ company });
    console.log('【工商信息】', JSON.stringify(biz.data && biz.data.item, null, 2));

    const score = await client.creditScore({ company, with_benchmark: 1 });
    console.log('【信用评分】', JSON.stringify(score.data, null, 2));
  } catch (e) {
    if (e instanceof ShehuiwenwuError) {
      console.error('调用失败：', e.code, e.message);
      if (e.code === 'bad_key' || e.code === 'invalid_key') console.error('请设置环境变量 RELICS_API_KEY（开放平台控制台申请）');
      if (e.code === 'insufficient_balance') console.error('余额不足，请到开放平台充值');
    } else {
      console.error(e);
    }
    process.exit(1);
  }
})();

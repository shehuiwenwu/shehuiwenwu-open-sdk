/**
 * 示例：拿一张器物图去比对国内被盗（丢失）文物库
 *
 * 运行：RELICS_API_KEY=你的密钥 node examples/node-relic-compare.js ./relic.jpg
 *
 * 三种模式：
 *   local    本地视觉特征 —— 快、稳，适合大批量初筛
 *   semantic 向量语义     —— 更宽容，角度/光线差异大时更有效
 *   hybrid   混合（推荐） —— 兼顾两者
 */
const { Client, ShehuiwenwuError } = require('../sdk/node');

const img = process.argv[2];
if (!img) { console.error('用法：node examples/node-relic-compare.js ./relic.jpg'); process.exit(1); }

(async () => {
  const client = new Client({ apiKey: process.env.RELICS_API_KEY || '' });
  try {
    const r = await client.circCnHybrid({ image: img, top_k: 5, threshold: 0.75 });
    const items = (r.data && r.data.items) || [];
    if (!items.length) return console.log('未比中相似记录。');

    console.log('命中 ' + items.length + ' 条（按相似度降序）：');
    items.forEach((it, i) => {
      console.log('  ' + (i + 1) + '. 相似度 ' + (it.score || it.similarity || '-') +
        '  ' + (it.name || it.title || '') + '  ' + (it.era || ''));
    });

    console.log('\n⚠️ 比对结果仅表示特征相似，需由专业人员进一步核实，不构成鉴定意见。');
  } catch (e) {
    console.error(e instanceof ShehuiwenwuError ? (e.code + ': ' + e.message) : e);
    process.exit(1);
  }
})();

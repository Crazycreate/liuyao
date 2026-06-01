# 六爻 · Liu Yao

AI 辅助的**六爻(纳甲/京房)占卜工具**,用来测**具体的事**(求财、问事、测病、寻物、问婚……)。

## 核心设计原则

> **起卦装卦要"算",断卦才"用 AI"。**

- **起卦 / 装卦是确定性计算**:摇卦得六爻 → 定本卦/变卦 → 京房八宫定卦宫世应 → 纳甲装干支五行 → 配六亲六神 → 取占时月建日辰旬空、标旺衰冲合。有唯一正确答案,绝不交给 LLM。
- **AI 只做断卦层**:拿到一副**已经排定、带全部标注**的卦,按"以用神为纲、旺衰生克为据"去断吉凶应期。

这样把幻觉关在门外:卦象不会错,AI 只在解读层发挥。

## 功能

- 🎲 **摇卦**:模拟三钱六摇(也可 `--lines` 手动输入既得之卦)
- 🧮 **全自动装卦**:本卦/变卦、卦宫、世应、纳甲(干支+五行)、六亲、六神、伏神
- 🗓️ **占时**:自动取此刻干支(年/月/日/时)、**月建·日辰·旬空**,逐爻标月破/日冲/日合/临日/临月
- 🔮 **AI 断卦**:按所问之事定用神,依月建日辰与动爻判旺衰生克,直断吉凶 + 应期
- 🆓 **默认免费免 key**:AI 断卦默认走 pollinations(免 key 开箱即用),可切 GLM/本地 Ollama/Claude 等

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 构建
npm run build

# 3. 摇一卦并断事(默认免 key)
node bin/liuyao.mjs "这次面试能成吗"
```

### 更多用法

```bash
# 手动输入既得之卦(初→上,每爻 6/7/8/9:6老阴 7少阳 8少阴 9老阳)
node bin/liuyao.mjs "丢的钱包能找回吗" --lines 6,7,8,9,7,8

# 指定占卦时间(默认此刻)
node bin/liuyao.mjs "今年财运如何" --date "2026-06-01 16:30"

# 只排卦、不调 AI
node bin/liuyao.mjs "测事" --no-ai

# 切换 AI(质量更好;glm 免费需 key,见 .env.example)
node bin/liuyao.mjs "测病" --provider glm
```

### 测试

```bash
npm test
```

## AI provider(断卦层)

排卦不花钱、不需要 key。只有 AI 断卦走 provider,在 `.env` 用 `AI_PROVIDER` 选一家:

| provider | 费用 | 需要 key | 说明 |
|----------|------|---------|------|
| `pollinations`(默认) | 免费 | 否 | 开箱即用、在线小模型;**对六爻长断常吐空,只够"先跑通",真断卦请换 ollama/glm** |
| `ollama` | 免费 | 否 | 本地运行、不联网;需装 [Ollama](https://ollama.com/) + `ollama pull qwen2.5:32b` |
| `glm` | 免费 | 是 | 中文强,推荐升级:[open.bigmodel.cn](https://open.bigmodel.cn/) |
| `gemini` / `groq` | 免费 | 是 | 见 `.env.example` |
| `anthropic` | 付费 | 是 | 质量最高 |
| `custom` | — | 看情况 | 任意 OpenAI 兼容端点 |

## 项目结构

```
src/
  trigrams.ts   八经卦 + 纳甲表
  hexagrams.ts  64 卦(京房八宫算法生成:卦宫/世应/卦名)
  wuxing.ts     五行生克 / 六亲 / 冲合
  cast.ts       摇卦(三钱六摇)
  date.ts       占时干支 + 旬空(lunar-javascript)
  najia.ts      装卦:逐爻配干支五行/六亲/六神/世应/标注 + 伏神
  render.ts     卦象文本渲染(CLI 与 AI 上下文同源)
  index.ts      castReading() 主入口
  ai/           多 provider 断卦层(provider/prompts/context/interpret)
bin/liuyao.mjs  CLI
```

## 断卦方法(AI 遵循的规则)

1. **定用神**:求财→妻财,功名/官司/测病之病→官鬼,子女/医药→子孙,文书/房产/长辈→父母,兄弟/竞争→兄弟。
2. **看旺衰**:以月建、日辰为根,辨旺相休囚、旬空、月破。
3. **看动静生克**:动爻生克、回头生克、化进化退。
4. **看世应**:定彼我向背。
5. **用神不上卦看伏神**。

## 免责声明

本工具仅供**传统文化学习与自我参考**。占断为**概率性参考,非决定论**,不构成任何专业建议,决策请以自身判断为准。

## License

MIT

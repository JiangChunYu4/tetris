<template>
  <div class="game-container">
    <div v-if="isGameOver" class="game-over">Game Over</div>
    <div class="main-frame">
      <div
        v-for="(item, index) in mainFrame"
        :key="index"
        class="cell"
        :style="{
          background: item.bgColor,
        }"
      ></div>
    </div>
    <div class="sub-frame">
      <div
        v-for="(item, index) in subFrame"
        :key="index"
        class="cell"
        :style="{
          background: item.bgColor,
        }"
      ></div>
    </div>
    <div class="operation-box">
      <div class="pause btn" @click="pauseGame">暂停</div>
      <div class="btn" @click="changeTheme">主题</div>
      <div class="rotate btn" @click="downRotate">旋转</div>
      <div class="btn" @click="moveLeft">向左</div>
      <div class="btn" @click="moveRight">向右</div>
      <div class="move-down btn" @click="moveDown">向下</div>
    </div>
    <div class="data-box">
      <div class="data-row">
        <div class="data-label">清除次数:</div>
        <div class="data">{{ clearTimes }}</div>
      </div>
      <div class="data-row">
        <div class="data-label">等级:</div>
        <div class="data">{{ level }}</div>
      </div>
      <div class="data-row">
        <div class="data-label">分数:</div>
        <div class="data">{{ score }}</div>
      </div>
      <div class="data-row">
        <div class="data-label">速度:</div>
        <div class="data">{{ speed }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from "vue";
import { transformRules, createAllBlock } from "@/utils/blockUtils";
import { flatIndex } from "@/utils/indexUtils";
const mainFrame = reactive([]); // 主屏
const subFrame = reactive([]); // 副屏
const mainFrameRow = ref(20); // 主屏行数
const mainFrameColumn = ref(10); // 主屏列数
const subFrameRow = ref(4); // 副屏行数
const subFrameColumn = ref(4); // 副屏列数
const bgColor = ref("#eeeeee"); // 主屏/副屏背景颜色
const theme = ref("lineGradientLigthTheme"); // 主题
const allBlocks = reactive([]); // 7种方块
const current = reactive({ index: 0, transform: 0 }); // 当前方块下标及旋转下标
const next = reactive({ index: 0, transform: 0 }); // 下一个方块下标及旋转下标
let currentBlock = reactive({}); // 当前方块
let nextBlock = reactive({}); // 下一个方块
const removeRows = reactive([]); // 预消除行的下标
let timer = null; // 控制游戏运行的定时器
const initSpeed = ref(800); // 初始速度
const speed = ref(initSpeed.value); // 当前速度
const minimumSpeed = ref(100); // 最快速度
const speedIncreasement = ref(40); // 速度增量
const isGameRunning = ref(false); // 游戏状态
const isGameOver = ref(false); // 游戏是否结束
const score = ref(0); // 得分
const level = ref(1); // 等级
const clearTimes = ref(0); // 消除次数
const upgradeThreshold = ref(10); // 等级升级阈值

const renderMainFrame = () => {
  for (let i = 0; i < mainFrameRow.value; i++) {
    for (let j = 0; j < mainFrameColumn.value; j++) {
      mainFrame.push(
        reactive({
          data: 0,
          bgColor: bgColor.value,
        })
      );
    }
  }
};
const renderSubFrame = () => {
  for (let i = 0; i < subFrameRow.value; i++) {
    for (let j = 0; j < subFrameColumn.value; j++) {
      subFrame.push(
        reactive({
          data: 0,
          bgColor: bgColor.value,
        })
      );
    }
  }
};
const renderBlock = (block, frame, frameColumn, type) => {
  const p = block.position;
  for (let i = 0; i < p.length; i += 2) {
    switch (type) {
      case "clear":
        frame[flatIndex(p[i], p[i + 1], frameColumn)].bgColor = bgColor.value;
        break;
      case "generate":
        frame[flatIndex(p[i], p[i + 1], frameColumn)].bgColor = block.color;
        break;
      case "fix":
        frame[flatIndex(p[i], p[i + 1], frameColumn)].data = 1;
        break;
    }
  }
};
const getNext = () => {
  let newIndex = Math.floor(Math.random() * allBlocks.length);
  while (newIndex === next.index) {
    newIndex = Math.floor(Math.random() * allBlocks.length);
  }
  next.index = newIndex;
  next.transform = Math.floor(Math.random() * 4);
};
const initGame = () => {
  current.index = next.index;
  current.transform = next.transform;
  currentBlock = JSON.parse(JSON.stringify(allBlocks[current.index]));
  initRotate(currentBlock, mainFrame, mainFrameColumn.value, current);
  getNext();
  if (nextBlock.position) {
    renderBlock(nextBlock, subFrame, subFrameColumn.value, "clear");
  }
  nextBlock = JSON.parse(JSON.stringify(allBlocks[next.index]));
  initRotate(nextBlock, subFrame, subFrameColumn.value, next);
};
const canMoveDown = () => {
  const p = currentBlock.position;
  for (let i = 0; i < p.length; i += 2) {
    if (p[i] >= mainFrameRow.value - 1) {
      return false;
    }
    const nextRowIndex = flatIndex(p[i] + 1, p[i + 1], mainFrameColumn.value);
    if (mainFrame[nextRowIndex].data > 0) {
      return false;
    }
  }
  return true;
};
const canMoveLeft = () => {
  const p = currentBlock.position;
  for (let i = 0; i < p.length; i += 2) {
    const nextRowIndex = flatIndex(p[i], p[i + 1] - 1, mainFrameColumn.value);
    if (p[i + 1] <= 0 || mainFrame[nextRowIndex].data > 0) {
      return false;
    }
  }
  return true;
};
const canMoveRight = () => {
  const p = currentBlock.position;
  for (let i = 0; i < p.length; i += 2) {
    const nextRowIndex = flatIndex(p[i], p[i + 1] + 1, mainFrameColumn.value);
    if (
      p[i + 1] >= mainFrameColumn.value - 1 ||
      mainFrame[nextRowIndex].data > 0
    ) {
      return false;
    }
  }
  return true;
};
const canRotate = () => {
  const block = JSON.parse(JSON.stringify(currentBlock));
  const t = current.transform;
  const index = current.index;
  const p = block.position;
  const x0 = p[0];
  const y0 = p[1];
  for (let i = 0; i < p.length; i += 2) {
    const x = p[i] - x0;
    const y = p[i + 1] - y0;
    const xOffest = x0 + transformRules[index][t].x;
    const yOffset = y0 + transformRules[index][t].y;
    p[i] = y + xOffest;
    p[i + 1] = -x + yOffset;
    if (
      p[i + 1] < 0 ||
      p[i + 1] >= mainFrameColumn.value ||
      p[i] >= mainFrameRow.value ||
      mainFrame[flatIndex(p[i], p[i + 1], mainFrameColumn.value)].data > 0
    ) {
      return false;
    }
  }
  return true;
};
const moveDown = () => {
  if (isGameOver.value || !isGameRunning.value) {
    return;
  }
  if (canMoveDown()) {
    renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "clear");
    for (let i = 0; i < currentBlock.position.length; i += 2) {
      currentBlock.position[i]++;
    }
    renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "generate");
  } else {
    renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "fix");
    clearBlock();
  }
};
const moveLeft = () => {
  if (isGameOver.value || !isGameRunning.value) {
    return;
  }
  if (canMoveLeft()) {
    renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "clear");
    for (let i = 0; i < currentBlock.position.length; i += 2) {
      currentBlock.position[i + 1]--;
    }
    renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "generate");
  }
};
const moveRight = () => {
  if (isGameOver.value || !isGameRunning.value) {
    return;
  }
  if (canMoveRight()) {
    renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "clear");
    for (let i = 0; i < currentBlock.position.length; i += 2) {
      currentBlock.position[i + 1]++;
    }
    renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "generate");
  }
};
const downRotate = () => {
  if (isGameOver.value || !isGameRunning.value) {
    return;
  }
  if (canRotate()) {
    renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "clear");
    const x0 = currentBlock.position[0];
    const y0 = currentBlock.position[1];
    for (let i = 0; i < currentBlock.position.length; i += 2) {
      const x = currentBlock.position[i] - x0;
      const y = currentBlock.position[i + 1] - y0;
      const xOffest = x0 + transformRules[current.index][current.transform].x;
      const yOffset = y0 + transformRules[current.index][current.transform].y;
      currentBlock.position[i] = y + xOffest;
      currentBlock.position[i + 1] = -x + yOffset;
    }
    current.transform = (current.transform + 1) % 4;
    renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "generate");
  }
};
const initRotate = (block, frame, frameColumn, blockInfo) => {
  renderBlock(block, frame, frameColumn, "clear");
  for (let i = 0; i < blockInfo.transform; i++) {
    const x0 = block.position[0];
    const y0 = block.position[1];
    for (let j = 0; j < block.position.length; j += 2) {
      const x = block.position[j] - x0;
      const y = block.position[j + 1] - y0;
      const xOffest = x0 + transformRules[blockInfo.index][i].x;
      const yOffest = y0 + transformRules[blockInfo.index][i].y;
      block.position[j] = y + xOffest;
      block.position[j + 1] = -x + yOffest;
    }
  }
  renderBlock(block, frame, frameColumn, "generate");
};
const calculateScore = (removeRow) => {
  score.value += ((removeRow * (removeRow + 1)) / 2) * 100 * level.value;
};
const speedUp = () => {
  clearTimes.value++;
  level.value = Math.max(
    level.value,
    Math.floor(clearTimes.value / upgradeThreshold.value) + 1
  );
  speed.value = initSpeed.value - (level.value - 1) * speedIncreasement.value;
  speed.value = Math.max(speed.value, minimumSpeed.value);
  startGame();
};
const clearBlock = () => {
  let columnCount = 0;
  for (let i = mainFrameRow.value - 1; i >= 0; i--) {
    let rowCount = 0;
    for (let j = 0; j < mainFrameColumn.value; j++) {
      if (mainFrame[flatIndex(i, j, mainFrameColumn.value)].data > 0) {
        rowCount++;
      }
    }
    if (rowCount === 0) {
      break;
    }
    if (rowCount === mainFrameColumn.value) {
      removeRows.push(i);
    }
    columnCount++;
  }
  if (columnCount === mainFrameRow.value - 1 || columnCount === mainFrameColumn.value) {
    pauseGame();
    isGameOver.value = true;
    return;
  }
  if (removeRows.length > 0) {
    for (let i = 0; i < removeRows.length; i++) {
      for (let j = 0; j < mainFrameColumn.value; j++) {
        const index = flatIndex(removeRows[i], j, mainFrameColumn.value);
        mainFrame[index].bgColor = bgColor.value;
        mainFrame[index].data = 0;
      }
    }
    for (let i = mainFrameRow.value - 1; i >= 0; i--) {
      let moveDownRow = 0;
      while (removeRows[moveDownRow] > i) {
        moveDownRow++;
      }
      if (moveDownRow > 0) {
        for (let k = 0; k < mainFrameColumn.value; k++) {
          const index = flatIndex(i, k, mainFrameColumn.value);
          if (mainFrame[index].data > 0) {
            const toIndex = flatIndex(
              i + moveDownRow,
              k,
              mainFrameColumn.value
            );
            mainFrame[toIndex].data = mainFrame[index].data;
            mainFrame[toIndex].bgColor = mainFrame[index].bgColor;
            mainFrame[index].data = 0;
            mainFrame[index].bgColor = bgColor.value;
          }
        }
      }
    }
    calculateScore(removeRows.length);
    speedUp();
    removeRows.splice(0, removeRows.length);
  }
  initGame();
};
const startGame = () => {
  if (isGameOver.value) {
    return;
  }
  isGameRunning.value = true;
  if (timer) {
    clearInterval(timer);
  }
  timer = setInterval(() => {
    moveDown();
  }, speed.value);
};
const pauseGame = () => {
  if (isGameOver.value) {
    return;
  }
  if (isGameRunning.value) {
    isGameRunning.value = false;
    clearInterval(timer);
  } else {
    startGame();
  }
};
const changeTheme = () => {
  if (theme.value === "lineGradientLigthTheme") {
    theme.value = "normalLightTheme";
  } else {
    theme.value = "lineGradientLigthTheme";
  }
};
const renderFrame = () => {
  renderMainFrame();
  renderSubFrame();
};
const handleKeyDown = (event) => {
  switch (event.key) {
    case "ArrowUp":
      downRotate();
      break;
    case "ArrowDown":
      moveDown();
      break;
    case "ArrowLeft":
      moveLeft();
      break;
    case "ArrowRight":
      moveRight();
      break;
    case "Enter":
      pauseGame();
      break;
    case "t":
      changeTheme();
      break;
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  renderFrame();
  createAllBlock(theme.value, allBlocks);
  getNext();
  initGame();
  watch(theme, (newValue) => {
    createAllBlock(newValue, allBlocks);
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyDown);
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style lang="less" scoped>
.game-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #fff;

  --main-frame-row: 20;
  --main-frame-column: 10;
  --sub-frame-row: 4;
  --sub-frame-column: 4;
  --cell-size: 20px;
  --cell-gap: 1px;
  --operation-box-width: 150px;
  --btn-height: 30px;
  --btn-border-radius: 5px;
  --game-over-font-size: 30px;
  --data-font-size: 16px;

  .game-over {
    position: absolute;
    color: limegreen;
    font-size: var(--game-over-font-size);
    line-height: var(--game-over-font-size);
    font-weight: bold;
    font-family: Consolas;
  }
  .main-frame {
    display: grid;
    grid-template-rows: repeat(var(--main-frame-row), 1fr);
    grid-template-columns: repeat(var(--main-frame-column), 1fr);
    gap: var(--cell-gap);
    border: 1px solid #ccc;
  }
  .sub-frame {
    position: absolute;
    top: calc(var(--cell-size) * 3);
    left: calc(50% + var(--cell-size) * 6);
    display: grid;
    grid-template-rows: repeat(var(--sub-frame-row), 1fr);
    grid-template-columns: repeat(var(--sub-frame-column), 1fr);
    gap: var(--cell-gap);
  }
  .cell {
    width: var(--cell-size);
    height: var(--cell-size);
  }
  .operation-box {
    margin-top: 10px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 5px;

    .btn {
      height: var(--btn-height);
      padding: 0 10px;
      background: rgba(72, 72, 213, 0.6);
      border-radius: var(--btn-border-radius);
      line-height: var(--btn-height);
      text-align: center;
      color: #fff;
      cursor: pointer;
    }

    .rotate,
    .move-down {
      grid-column: 1/3;
      border-radius: calc(var(--btn-border-radius) * 2);
    }
  }
  .data-box {
    position: absolute;
    top: calc(var(--cell-size) * 10);
    left: calc(50% + var(--cell-size) * 6);
    .data-row {
      display: flex;
      gap: 10px;
      .data-label {
        font-size: var(--data-font-size);
      }
      .data {
        font-size: var(--data-font-size);
        font-weight: 700;
        color: #00aaee;
      }
    }
  }
}
</style>

<template>
  <div class="game-container">
    <div class="game-left">
      <div class="main-frame">
        <div
          v-for="(item, index) in mainFrame.slice(
            mainFrameColumn * subFrameRow
          )"
          :key="index"
          class="cell"
          :class="{ flash: item.flash }"
          :style="
            item.flash
              ? {
                  background: bgColor,
                  animation: `flash-bg 0.2s alternate ${flashTimes.value}`,
                  '--flash-block-color': item.bgColor,
                }
              : { background: item.bgColor }
          "
        >
          <div v-if="isGameOver" class="game-over">Game Over</div>
        </div>
      </div>
      <div class="operation-box">
        <div class="rotate btn" @click="downRotate">旋转</div>
        <div class="btn" @click="moveLeft">向左</div>
        <div class="btn" @click="moveRight">向右</div>
        <div
          class="move-down btn"
          @click="moveDown"
          @touchstart="startLongPressMoveDown"
          @touchend="endLongPressMoveDown"
        >
          向下
        </div>
      </div>
    </div>
    <div class="game-right">
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
        <div class="data-row">
          <div class="data-label">历史记录:</div>
          <div class="data">{{ record }}</div>
        </div>
      </div>
      <div class="system-box">
        <div class="btn" @click="pauseGame" v-if="isGameRunning">
          暂停 ENTER
        </div>
        <div class="btn" @click="pauseGame" v-else="!isGameRunning">
          开始 ENTER
        </div>
        <div class="btn" @click="changeTheme">切换主题 T</div>
        <div class="btn" @click="resetGame">重新开始 R</div>
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
const mainFrameRow = ref(24); // 主屏行数
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
const timer = ref(null); // 控制游戏运行的定时器
const removeRows = reactive([]); // 预消除行的下标
const initSpeed = ref(800); // 初始速度
const speed = ref(initSpeed.value); // 当前速度
const minimumSpeed = ref(100); // 最快速度
const speedIncreasement = ref(40); // 速度增量
const flashTimes = ref(3); // 方块消除闪动次数
const isGameRunning = ref(false); // 游戏状态
const isGameOver = ref(false); // 游戏是否结束
const score = ref(0); // 得分
const level = ref(1); // 等级
const clearTimes = ref(0); // 消除次数
const upgradeThreshold = ref(5); // 等级升级阈值
const record = ref(0); // 历史记录

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
  setTimeout(() => {
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
  }, 0);
};

const moveLeft = () => {
  if (isGameOver.value || !isGameRunning.value) {
    return;
  }
  setTimeout(() => {
    if (canMoveLeft()) {
      renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "clear");
      for (let i = 0; i < currentBlock.position.length; i += 2) {
        currentBlock.position[i + 1]--;
      }
      renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "generate");
    }
  }, 0);
};

const moveRight = () => {
  if (isGameOver.value || !isGameRunning.value) {
    return;
  }
  setTimeout(() => {
    if (canMoveRight()) {
      renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "clear");
      for (let i = 0; i < currentBlock.position.length; i += 2) {
        currentBlock.position[i + 1]++;
      }
      renderBlock(currentBlock, mainFrame, mainFrameColumn.value, "generate");
    }
  }, 0);
};

const downRotate = () => {
  if (isGameOver.value || !isGameRunning.value) {
    return;
  }
  setTimeout(() => {
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
  }, 0);
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
  if (columnCount >= mainFrameRow.value - subFrameRow.value) {
    pauseGame();
    isGameOver.value = true;
    return;
  }
  if (removeRows.length === 0) {
    initGame();
    return;
  }
  isGameRunning.value = false;
  for (let t = 0; t < flashTimes.value; t++) {
    setTimeout(() => {
      for (let i = 0; i < removeRows.length; i++) {
        for (let j = 0; j < mainFrameColumn.value; j++) {
          const index = flatIndex(removeRows[i], j, mainFrameColumn.value);
          mainFrame[index].flash = !mainFrame[index].flash;
        }
      }
    }, t * 200);
  }
  setTimeout(() => {
    for (let i = 0; i < removeRows.length; i++) {
      for (let j = 0; j < mainFrameColumn.value; j++) {
        const index = flatIndex(removeRows[i], j, mainFrameColumn.value);
        mainFrame[index].bgColor = bgColor.value;
        mainFrame[index].data = 0;
        mainFrame[index].flash = false;
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
    isGameRunning.value = true;
    initGame();
  }, flashTimes.value * 200);
};

const clearTimer = (timer) => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

const resetData = () => {
  clearTimes.value = 0;
  level.value = 0;
  score.value = 0;
  speed.value = initSpeed.value;
};

const clearFrame = (frame) => {
  for (let i = 0; i < frame.length; i++) {
    frame[i].data = 0;
    frame[i].bgColor = bgColor.value;
  }
};

const resetGame = () => {
  resetData();
  clearFrame(mainFrame);
  clearFrame(subFrame);
  getNext();
  initGame();
  isGameOver.value = false;
  isGameRunning.value = false;
  clearTimer(timer.value);
};

const startGame = () => {
  if (isGameOver.value) {
    return;
  }
  isGameRunning.value = true;
  clearTimer(timer.value);
  timer.value = setInterval(() => {
    moveDown();
  }, speed.value);
};

const pauseGame = () => {
  if (isGameOver.value) {
    return;
  }
  if (isGameRunning.value) {
    isGameRunning.value = false;
  clearTimer(timer.value);
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

const startLongPressMoveDown = (event) => {
  event.preventDefault();
  clearTimer(timer.value);
  timer.value = setInterval(() => {
    moveDown();
  }, minimumSpeed.value);
};

const endLongPressMoveDown = (event) => {
  event.preventDefault();
  clearTimer(timer.value);
  timer.value = setInterval(() => {
    moveDown();
  }, speed.value);
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
    case "r":
      resetGame();
      break;
  }
};

const loadRecord = () => {
  const r = localStorage.getItem("record");
  if (r) {
    record.value = parseInt(r);
  }
};

const storeRecord = () => {
  localStorage.setItem("record", record.value);
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  renderMainFrame();
  renderSubFrame();
  createAllBlock(theme.value, allBlocks);
  loadRecord();
  getNext();
  initGame();
  watch(theme, (newValue) => {
    createAllBlock(newValue, allBlocks);
  });
  watch(isGameOver, (newValue) => {
    if (newValue) {
      if (score.value > record.value) {
        record.value = score.value;
        storeRecord(record.value);
      }
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyDown);
  clearTimer(timer.value);
});
</script>

<style lang="less" scoped>
.game-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background: #fff;

  --main-frame-row: 20;
  --main-frame-column: 10;
  --sub-frame-row: 4;
  --sub-frame-column: 4;
  --cell-size: 20px;
  --cell-gap: 1px;
  --operation-box-width: 150px;
  --btn-height: 60px;
  --btn-border-radius: 5px;
  --game-over-font-size: 30px;
  --data-font-size: 16px;

  .game-left {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    .main-frame {
      position: relative;
      display: grid;
      grid-template-rows: repeat(var(--main-frame-row), var(--cell-size));
      grid-template-columns: repeat(var(--main-frame-column), var(--cell-size));
      gap: var(--cell-gap);
      border: 1px solid #ccc;
      .game-over {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        color: limegreen;
        font-size: var(--game-over-font-size);
        line-height: var(--game-over-font-size);
        font-weight: bold;
        font-family: Consolas;
        text-align: center;
      }
    }
    .operation-box {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px 10px;
      .btn {
        height: var(--btn-height);
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
  }

  .game-right {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    .sub-frame {
      display: grid;
      grid-template-rows: repeat(var(--sub-frame-row), var(--cell-size));
      grid-template-columns: repeat(var(--sub-frame-column), var(--cell-size));
      gap: var(--cell-gap);
    }
    .data-box {
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
    .system-box {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 5px;
      .btn {
        width: 100px;
        background: rgba(246, 214, 11, 0.8);
        border-radius: var(--btn-border-radius);
        line-height: 50px;
        text-align: center;
        color: #fff;
        font-family: Consolas;
        cursor: pointer;
      }
    }
  }

  .cell {
    width: var(--cell-size);
    height: var(--cell-size);
    transition: background 0.2s;
  }
  @keyframes flash-bg {
    0% {
      background: var(--flash-block-color, #fff);
    }
    100% {
      background: #eeeeee;
    }
  }
}
</style>

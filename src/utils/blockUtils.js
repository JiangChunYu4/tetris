/**
 * 调色盘 用于切换方块的颜色
 */
const colorPalette = {
  lineGradientLigthTheme: [
    "linear-gradient(180deg, #FFA7EB 0%, #F026A8 100%)",
    "linear-gradient(180deg, #DFA1FF 0%, #9A36F0 100%)",
    "linear-gradient(180deg, #9EAAFF 0%, #3846F4 100%)",
    "linear-gradient(180deg, #7BE7FF 0%, #1E85E2 100%)",
    "linear-gradient(180deg, #89FED8 0%, #18C997 100%)",
    "linear-gradient(180deg, #FFED48 0%, #FD9E16 100%)",
    "linear-gradient(180deg, #FFBA8D 0%, #EB6423 100%)",
  ],
  normalLightTheme: [
    "#2B7AF5",
    "#2B9DF5",
    "#79CFFF",
    "#1B67DD",
    "#4F94FF",
    "#2180F2",
    "#3FD0FF",
  ],
};

/**
 * 7种方块的坐标 偶数下标为各点的横坐标 奇数下标为各点的纵坐标
 */
const allBlockPosition = [
  [0, 1, 0, 2, 1, 2, 2, 2], // L
  [0, 1, 1, 1, 1, 2, 2, 2], // S
  [1, 1, 1, 2, 2, 1, 2, 2], // O
  [1, 0, 1, 1, 1, 2, 1, 3], // I
  [0, 2, 1, 1, 1, 2, 2, 1], // Z
  [0, 1, 0, 2, 1, 1, 2, 1], // J
  [1, 1, 2, 0, 2, 1, 2, 2], // T
];

/**
 * 7种方块的旋转规则 每个方块绕第一个坐标右旋后的修正向量
 */
const transformRules = [
  [
    { x: 1, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -2 },
    { x: -2, y: 1 },
  ],
  [
    { x: 1, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -2 },
    { x: -2, y: 1 },
  ],
  [
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
  ],
  [
    { x: -1, y: 2 },
    { x: 1, y: 1 },
    { x: 2, y: -1},
    { x: -2, y: -2 },
  ],
  [
    { x: 2, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: -1 },
    { x: -1, y: 2 },
  ],
  [
    { x: 1, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -2 },
    { x: -2, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 0 },
  ],
];

/**
 * 根据主题创建所有的方块
 * @param {*} theme  主题
 * @param {*} allBlocks  存储方块的数组
 * @returns 7种方块
 */
const createAllBlock = (theme, allBlocks) => {
  allBlocks.splice(0, allBlocks.length);
  for (let i = 0; i < allBlockPosition.length; i++) {
    const block = {
      position: allBlockPosition[i],
      color: colorPalette[theme][i],
    };
    allBlocks.push(block);
  }
};

export { transformRules, createAllBlock };

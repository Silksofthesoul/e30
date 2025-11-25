'use strict';
(function () {
  const { Scene, Matrix, rndInt, int } = $dep.import(['Scene', 'Matrix', 'rndInt', 'int']);


  // matrix
  // const lib = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const lib = [9, 4, 2];
  // const width = int( window.innerWidth / 20 ) - 1;
  // const height = int( window.innerHeight / 20 ) - 1;

  // Размерность матрицы подстраиваем под размер окна, чтобы максимально покрывать вьюпорт
  const baseCellSize = 64; // целевой размер клетки (px)

  function createMatrix() {
    const width = Math.max(1, int(window.innerWidth / baseCellSize));
    const height = Math.max(1, int(window.innerHeight / baseCellSize));
    const matrix = new Matrix({ width, height, lib });
    matrix.gen();
    return matrix;
  }

  // Параметры авто-режима
  const AUTO_START_DELAY = 5000; // мс до старта авто-режима, если пользователь не кликнул кластер
  const AUTO_STEP_INTERVAL_MIN = 700;  // минимальная пауза между авто-кликами
  const AUTO_STEP_INTERVAL_MAX = 3000; // максимальная пауза между авто-кликами
  const AUTO_REINIT_DELAY = 3000; // мс до реинициализации, когда кластеров не осталось

  let matrix = null;
  const scene = new Scene();

  let autoMode = false;
  let autoStepTimerId = null;
  let autoStartTimerId = null;
  let autoReinitTimerId = null;

  function attachMatrixBehaviors(m) {
    // Коллбек от матрицы, когда был очищен кластер
    m.onClusterCleared = ({ auto }) => {
      if (!auto) {
        // Пользователь сам кликнул по кластеру — делаем паузу и
        // перезапускаем авто-режим, если он не возобновится за AUTO_START_DELAY
        stopAutoMode();
        if (autoStartTimerId) clearTimeout(autoStartTimerId);
        autoStartTimerId = setTimeout(startAutoModeIfNeeded, AUTO_START_DELAY);
      }
    };
  }

  function startAutoModeIfNeeded() {
    if (autoMode || !matrix) return;
    startAutoMode();
  }

  function startAutoMode() {
    if (!matrix || autoMode) return;
    autoMode = true;
    scheduleNextAutoStep();
  }

  function stopAutoMode() {
    autoMode = false;
    if (autoStepTimerId) {
      clearTimeout(autoStepTimerId);
      autoStepTimerId = null;
    }
    if (autoReinitTimerId) {
      clearTimeout(autoReinitTimerId);
      autoReinitTimerId = null;
    }
  }

  function scheduleNextAutoStep() {
    if (!autoMode) return;
    if (autoStepTimerId) clearTimeout(autoStepTimerId);

    const delay = rndInt(AUTO_STEP_INTERVAL_MIN, AUTO_STEP_INTERVAL_MAX);
    autoStepTimerId = setTimeout(runAutoStep, delay);
  }

  function runAutoStep() {
    if (!autoMode || !matrix) return;

    const cluster = matrix.findAnyCluster();
    if (!cluster) {
      // Кластеров больше нет — через AUTO_REINIT_DELAY реинициализируем
      if (!autoReinitTimerId) {
        autoReinitTimerId = setTimeout(() => {
          autoReinitTimerId = null;
          reinitMatrix();
        }, AUTO_REINIT_DELAY);
      }
      return;
    }

    const [x, y] = cluster.cells[0];
    matrix.hideConnectedCells(x, y, { auto: true });

    scheduleNextAutoStep();
  }

  function reinitMatrix() {
    stopAutoMode();

    matrix = createMatrix();
    attachMatrixBehaviors(matrix);

    scene
      .append('matrix', matrix)
      .render();

    // Запланировать возможный новый авто-режим, если пользователь снова ничего не сделает
    if (autoStartTimerId) clearTimeout(autoStartTimerId);
    autoStartTimerId = setTimeout(startAutoModeIfNeeded, AUTO_START_DELAY);
  }

  // Инициализация сцены и матрицы
  matrix = createMatrix();
  attachMatrixBehaviors(matrix);

  scene
    .append('matrix', matrix)
    .render();

  // Авто-режим запустится, если пользователь не кликнет по кластеру в течение AUTO_START_DELAY
  autoStartTimerId = setTimeout(startAutoModeIfNeeded, AUTO_START_DELAY);

  // При изменении размеров окна пересоздаём матрицу с новой размерностью
  window.addEventListener('resize', () => {
    // При ресайзе пересоздаём матрицу и сохраняем текущий режим (autoMode флаг остаётся)
    const wasAuto = autoMode;
    stopAutoMode();

    matrix = createMatrix();
    attachMatrixBehaviors(matrix);

    scene
      .append('matrix', matrix)
      .render();

    if (wasAuto) {
      // Если до ресайза был авто-режим — возобновим его
      startAutoMode();
    } else {
      // Перезапускаем ожидание авто-режима после ресайза
      if (autoStartTimerId) clearTimeout(autoStartTimerId);
      autoStartTimerId = setTimeout(startAutoModeIfNeeded, AUTO_START_DELAY);
    }
  });

})();

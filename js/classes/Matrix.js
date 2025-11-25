'use strict';
(function () {
  const { Base, Cell, rndFromArray, int } = $import(['Base', 'Cell', 'rndFromArray', 'int']);

  class Matrix extends Base{
    elRoot = null;
    animating = false;

    width  = 1;
    height = 1;
    lib = [0];
    data   = [];

    constructor(params = {}) {
      super({ ...params, name: 'Matrix' });
      const {width, height, lib = []} = params;
      if(lib) this.lib = [...new Set(lib)];
      this.width = width;
      this.height = height;
      this.init();
    }

    init() {
      this.initElement();
      this.initData();
      this.gen();
    }

    initElement() {
      this.elRoot = document.createElement('div');
      this.elRoot.classList.add('matrix');
      this.elRoot.addEventListener('click', this.handleClick.bind(this));

      return this;
    }

    initData() {
      this.data = [];
      for(let y = 0; y < this.height; y++) {
        this.data.push([]);
        for(let x = 0; x < this.width; x++) this.data[y].push(new Cell({ x, y }));
      }
    }
    
    gen() {

      for(let y = 0; y < this.height; y++) {
        for(let x = 0; x < this.width; x++) this.data[y][x].value = rndFromArray(this.lib);
      }
      return this;
    }

    handleClick(event) {
      if (this.animating) return null;

      const { isNaN } = Number;
      const cellEl = event.target.closest('.matrix__cell');
      if (!cellEl || !this.elRoot.contains(cellEl)) return null;

      const x = int(cellEl.dataset.x);
      const y = int(cellEl.dataset.y);
      if (isNaN(x) || isNaN(y)) return null;

      const row = this.data[y];
      const cell = row && row[x];
      if (!cell || cell.hidden) return null;

      this.hideConnectedCells(x, y, { auto: false });
    }

    // Найти случайный кластер (связную компоненту размером >= 2) и вернуть список координат
    findAnyCluster() {
      const visited = new Set();
      const makeKey = (x, y) => `${x}:${y}`;

      const total = this.width * this.height;
      const indices = [];
      for (let i = 0; i < total; i++) indices.push(i);

      // Перемешиваем порядок обхода клеток (Fisher–Yates)
      for (let i = total - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
      }

      for (let k = 0; k < total; k++) {
        const idx = indices[k];
        const x = idx % this.width;
        const y = Math.floor(idx / this.width);

        const cell = this.data[y][x];
        if (!cell || cell.hidden || cell.value === null || cell.value === undefined) continue;

        const startKey = makeKey(x, y);
        if (visited.has(startKey)) continue;

        const stack = [[x, y]];
        const cluster = [];
        const targetValue = cell.value;

        while (stack.length) {
          const [cx, cy] = stack.pop();
          const key = makeKey(cx, cy);
          if (visited.has(key)) continue;
          visited.add(key);

          const row = this.data[cy];
          const c = row && row[cx];
          if (!c || c.hidden || c.value !== targetValue) continue;

          cluster.push([cx, cy]);

          if (cx > 0) stack.push([cx - 1, cy]);
          if (cx < this.width - 1) stack.push([cx + 1, cy]);
          if (cy > 0) stack.push([cx, cy - 1]);
          if (cy < this.height - 1) stack.push([cx, cy + 1]);
        }

        if (cluster.length >= 2) {
          return { cells: cluster, value: targetValue };
        }
      }

      return null;
    }

    hideConnectedCells(startX, startY, options = {}) {
      const { auto = false } = options;

      const startRow = this.data[startY];
      const startCell = startRow && startRow[startX];
      if (!startCell || startCell.hidden) return null;

      const targetValue = startCell.value;
      if (targetValue === null || targetValue === undefined) return null;

      const stack = [[startX, startY]];
      const visited = new Set();
      const toHide = [];

      const makeKey = (x, y) => `${x}:${y}`;

      while (stack.length) {
        const [x, y] = stack.pop();
        const key = makeKey(x, y);
        if (visited.has(key)) continue;
        visited.add(key);

        const row = this.data[y];
        const cell = row && row[x];
        if (!cell || cell.hidden || cell.value !== targetValue) continue;

        toHide.push([x, y]);

        if (x > 0) stack.push([x - 1, y]);
        if (x < this.width - 1) stack.push([x + 1, y]);
        if (y > 0) stack.push([x, y - 1]);
        if (y < this.height - 1) stack.push([x, y + 1]);
      }

      // Если размер компоненты == 1, считаем её одиночной и не трогаем
      if (toHide.length < 2) return null;

      this.animateClusterDisappearance(toHide, { auto });
    }

    // Анимация исчезновения кластера: клетки по очереди смещаются вниз и растворяются,
    // после чего применяется гравитация и запускается падение оставшихся.
    animateClusterDisappearance(toHide, options = {}) {
      const { auto = false } = options;
      if (!toHide || !toHide.length) return null;

      if (this.animating) return null;
      this.animating = true;

      const availableWidth = window.innerWidth;
      const availableHeight = window.innerHeight;
      const cellSize = Math.min(
        availableWidth / this.width,
        availableHeight / this.height,
      );

      const MOVE_PX = cellSize * 0.4;
      const STAGGER_MS = 60;   // задержка между соседними клетками в анимации исчезновения
      const FADE_MS = 300;     // примерная длительность растворения (с запасом к CSS-transition)

      const items = toHide
        .map(([x, y]) => {
          const row = this.data[y];
          const cell = row && row[x];
          const el = cell && cell.element;
          if (!cell || !el || cell.hidden) return null;
          return { x, y, cell, el };
        })
        .filter(Boolean);

      if (!items.length) {
        // Фолбэк: если по какой-то причине нет DOM-элементов, просто применяем старую логику
        for (let i = 0; i < toHide.length; i++) {
          const [x, y] = toHide[i];
          const cell = this.data[y] && this.data[y][x];
          if (!cell) continue;
          cell.hidden = true;
          cell.value = null;
        }
        this.applyGravity();
        this.render();
        this.animating = false;
        if (typeof this.onClusterCleared === 'function') this.onClusterCleared({ auto });
        return null;
      }

      // Упорядочиваем клетки так, чтобы сначала анимировались нижние (более зрелищный эффект)
      items.sort((a, b) => b.y - a.y);

      items.forEach((item, index) => {
        const { el } = item;
        const delay = index * STAGGER_MS;

        // Стартовое состояние (на случай, если там остались старые стили)
        el.style.opacity = '1';
        el.style.transform = 'translateY(0px) scale(1)';

        setTimeout(() => {
          el.style.transform = `translateY(${MOVE_PX}px) scale(0.9)`;
          el.style.opacity = '0';
        }, delay);
      });

      const totalDelay = STAGGER_MS * (items.length - 1) + FADE_MS;

      setTimeout(() => {
        // Логически удаляем клетки кластера
        for (let i = 0; i < toHide.length; i++) {
          const [x, y] = toHide[i];
          const row = this.data[y];
          const cell = row && row[x];
          if (!cell) continue;
          cell.hidden = true;
          cell.value = null;

          if (cell.element) {
            cell.element.style.opacity = '';
            cell.element.style.transform = '';
          }
        }

        this.applyGravity();
        this.render();
        this.animating = false;

        if (typeof this.onClusterCleared === 'function') {
          this.onClusterCleared({ auto });
        }
      }, totalDelay);

      return null;
    }

    applyGravity() {
      // Для каждого столбца «роняем» все видимые клетки вниз,
      // а пустые (hidden) поднимаем вверх.
      for (let x = 0; x < this.width; x++) {
        // Сбрасываем расстояние падения для всех клеток столбца
        for (let y = 0; y < this.height; y++) {
          this.data[y][x].fallDistance = 0;
        }

        let writeY = this.height - 1;

        for (let y = this.height - 1; y >= 0; y--) {
          const cell = this.data[y][x];
          if (!cell.hidden) {
            if (writeY !== y) {
              const target = this.data[writeY][x];
              target.value = cell.value;
              target.hidden = false;

              const delta = writeY - y;
              target.fallDistance = delta;

              cell.value = null;
              cell.hidden = true;
            }
            writeY--;
          }
        }
      }
    }

    render() {
      const availableWidth = window.innerWidth;
      const availableHeight = window.innerHeight;
      const cellSize = Math.min(
        availableWidth / this.width,
        availableHeight / this.height,
      );
      this.elRoot.style.setProperty('--cell-size', `${cellSize}px`);

      this.elRoot.innerHTML = '';

      for (let y = 0; y < this.height; y++) {
        const rowEl = document.createElement('div');
        rowEl.classList.add('matrix__row');

        for (let x = 0; x < this.width; x++) {
          const cell = this.data[y][x];

          // Определяем, принадлежит ли клетка какому-либо кластеру (есть ли сосед с тем же value)
          let clickable = false;
          if (!cell.hidden && cell.value !== null && cell.value !== undefined) {
            const v = cell.value;

            const left  = x > 0 ? this.data[y][x - 1] : null;
            const right = x < this.width - 1 ? this.data[y][x + 1] : null;
            const up    = y > 0 ? this.data[y - 1][x] : null;
            const down  = y < this.height - 1 ? this.data[y + 1][x] : null;

            if (left  && !left.hidden  && left.value  === v) clickable = true;
            if (right && !right.hidden && right.value === v) clickable = true;
            if (up    && !up.hidden    && up.value    === v) clickable = true;
            if (down  && !down.hidden  && down.value  === v) clickable = true;
          }

          cell.clickable = clickable;
          cell.render(rowEl);
        }

        this.elRoot.appendChild(rowEl);
      }

      // Анимация падения: для клеток, у которых fallDistance > 0,
      // сначала рисуем их чуть выше, затем по очереди сбрасываем transform,
      // чтобы создать каскадный эффект: первыми падают нижние клетки столбца.
      const falling = [];
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const cell = this.data[y][x];
          if (cell.hidden || !cell.fallDistance || cell.fallDistance <= 0 || !cell.element) continue;

          const offset = cell.fallDistance * cellSize;
          const el = cell.element;
          // Начальное положение: выше на offset, без масштабирования (scale(1))
          el.style.transform = `translateY(${-offset}px) scale(1)`;
          falling.push({ el, y });
        }
      }

      if (falling.length) {
        const maxY = falling.reduce((max, item) => Math.max(max, item.y), 0);
        const STAGGER_MS = 60; // задержка между соседними клетками по вертикали
        const SQUASH_MS = 140; // длительность фазы "сжатия" перед возвратом к нормальному размеру

        requestAnimationFrame(() => {
          falling.forEach(({ el, y }) => {
            const delay = (maxY - y) * STAGGER_MS;
            setTimeout(() => {
              // Сначала падаем и немного сжимаемся (scale 0.85)
              el.style.transform = 'translateY(0px) scale(0.85)';

              // Затем мягко возвращаемся к исходному размеру (scale 1)
              setTimeout(() => {
                el.style.transform = 'translateY(0px) scale(1)';
              }, SQUASH_MS);
            }, delay);
          });
        });
      }

      return this;
    }

    get element (){return this.elRoot;}
  }

  $export({ Matrix });
})();

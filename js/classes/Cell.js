'use strict';
(function () {
  const { Base } = $import(['Base']);

  class Cell extends Base{
    elRoot = null;
    value = null;
    x = 0;
    y = 0;
    hidden = false;
    fallDistance = 0; // на сколько клеток нужно анимированно «упасть»
    clickable = false; // принадлежит ли клетка кластеру (есть ли сосед с таким же value)

    constructor(params = {}) {
      super({ ...params, name: 'Cell' });
      const {
        value = null,
        x = 0,
        y = 0,
        hidden = false,
      } = params;

      if (value !== null && value !== undefined) this.value = value;
      this.x = x;
      this.y = y;
      this.hidden = hidden;
    }

    // Рендерит ячейку и (опционально) добавляет её в переданный родительский элемент строки
    render(parentEl) {
      if (!this.elRoot) {
        this.elRoot = document.createElement('div');
        this.elRoot.classList.add('matrix__cell');
      }

      // Сбросить модификаторы и обновить по текущему состоянию
      this.elRoot.className = 'matrix__cell';

      // Координаты ячейки внутри матрицы (используются для обработки кликов)
      this.elRoot.dataset.x = this.x;
      this.elRoot.dataset.y = this.y;

      if (this.value !== null && this.value !== undefined) {
        const colorClass = `matrix__cell--m-${this.value}`;
        this.elRoot.classList.add(colorClass);
        // Для отладки можно отобразить значение:
        // this.elRoot.textContent = this.value;
      } else {
        this.elRoot.textContent = '';
      }

      if (this.hidden) {
        this.elRoot.classList.add('matrix__cell--hidden');
      } else if (this.clickable) {
        this.elRoot.classList.add('matrix__cell--clickable');
      }

      if (parentEl) parentEl.appendChild(this.elRoot);

      return this;
    }

    get element (){return this.elRoot;}
  }

  $dep.export({ Cell });
})();

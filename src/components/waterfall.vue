<template>
  <div
    class="vue-waterfall-container"
    :style="{
      width: width && !isMobile ? width + 'px' : '',
      height: height + 'px',
    }"
  >
    <div
      class="loading ball-beat"
      v-show="isPreloading"
      :class="{ first: isFirstLoad }"
    >
      <slot name="loading"></slot>
      <template v-if="!hasLoadingSlot">
        <div
          class="dot"
          v-for="(item, index) in loadingDotCount"
          :key="index"
          :style="loadingDotStyle"
        ></div>
      </template>
    </div>

    <div class="vue-waterfall-scroll" ref="scrollEl">
      <slot name="waterfall-head"></slot>
      <div
        class="vue-waterfall"
        :style="
          isMobile
            ? ''
            : {
                width: colWidth * cols + 'px',
                left: '50%',
                marginLeft: (-1 * colWidth * cols) / 2 + 'px',
              }
        "
      >
        <div
          class="img-box"
          v-for="(item, index) in imgsArr_c"
          :key="index"
          :class="[cardAnimationClass, { __err__: item._error }]"
          :style="{
            padding: gap_c / 2 + 'px',
            width: isMobile ? '' : colWidth + 'px',
          }"
          @click="
            handleClickImage($event, {
              value: item,
              index: index,
            })
          "
        >
          <div :class="[cardClass]">
            <div class="img-box-header" v-if="hasHeaderSlot">
              <slot name="header" :data="item"></slot>
            </div>
            <component
              class="img-inner-box"
              :is="Link"
              v-if="item[srcKey]"
              :data-index="index"
              :style="{
                width: imgWidth_c + 'px',
                height: item._height ? item._height + 'px' : false,
              }"
            >
              <img :src="item[srcKey]" />
            </component>
            <div class="img-box-footer" v-if="hasFooterSlot">
              <slot name="footer" :data="item"></slot>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Link from "./link.vue";
import { computed, nextTick, onMounted, ref, useSlots, watch } from "vue";
import { isMobileFn } from "../utils";
import { propsParams } from "./props";

const props = defineProps(propsParams);

const isMobile = ref<boolean>(false);
// 正在预加载中，显示加载动画
const isPreloading = ref<boolean>(true);
// 待图片预加载imgsArr完成，插入新的字段height之后,才会生成imgsArr_c，这时才开始渲染
const imgsArr_c = ref<any>([]);
// 需要根据窗口宽度初始化
const cols = ref();
const loadedCount = ref<number>(0);
// 首次加载
const isFirstLoad = ref<boolean>(true);
//所有的.img-box元素
const imgBoxEls = ref<any>();
// 开始要排列的图片索引,首次为第二列的第一张图片，后续加载则为已经排列图片的下一个索引
const beginIndex = ref(0);
const colsHeightArr = ref<any>([]);

const slots = useSlots();
console.log({ slots });

const hasLoadingSlot = computed(() => !!slots.loading);
const hasHeaderSlot = computed(() => !!slots.header);
const hasFooterSlot = computed(() => !!slots.footer);

const imgWidth_c = computed(() => {
  //对于移动端重新计算图片宽度
  return isMobile.value ? window.innerWidth / 2 : props.imgWidth;
});

const gap_c = computed(() => {
  return isMobile.value ? props.mobileGap : props.gap;
});

const colWidth = computed(() => {
  // 每一列的宽度
  return imgWidth_c.value + gap_c.value;
});

watch(
  () => props.imgsArr,
  (newVal: any, oldVal: any) => {
    if (
      imgsArr_c.value.length > newVal.length ||
      (imgsArr_c.value.length > 0 && newVal[0] && !newVal[0]._height)
    ) {
      reset();
    }
    preload();
  }
);

const emits = defineEmits([
  "preloaded",
  "imgError",
  "scrollReachBottom",
  "click",
  "pullDownMove",
  "pullDownEnd",
]);

// 预加载
const preload = () => {
  props.imgsArr?.forEach((imgItem: any, imgIndex: number) => {
    if (imgIndex < loadedCount.value) return; // 只对新加载图片进行预加载
    // 无图时
    // debugger
    if (!imgItem[props.srcKey]) {
      props.imgsArr[imgIndex]._height = 0;
      loadedCount.value++;
      // 支持无图模式
      if (loadedCount.value === props.imgsArr?.length) {
        // emits("preloaded");
        isFirstLoad.value = false;
        imgsArr_c.value = props.imgsArr.concat([]); // 预加载完成，这时才开始渲染
        nextTick(() => {
          isPreloading.value = false;
          waterfall();
        });
      }
      return;
    }

    let oImg = new Image();
    oImg.src = imgItem[props.srcKey];
    oImg.onload = oImg.onerror = (e: any) => {
      loadedCount.value++;
      // 预加载图片，计算图片容器的高
      props.imgsArr[imgIndex]._height =
        e.type == "load"
          ? Math.round(imgWidth_c.value * (oImg.height / oImg.width))
          : imgWidth_c.value;
      if (e.type == "error") {
        props.imgsArr[imgIndex]._error = true;
        emits("imgError", props.imgsArr[imgIndex]);
      }
      if (loadedCount.value === props.imgsArr?.length) {
        // emits("preloaded");
        isFirstLoad.value = false;
        imgsArr_c.value = props.imgsArr.concat([]); // 预加载完成，这时才开始渲染
        nextTick(() => {
          isPreloading.value = false;
          waterfall();
        });
      }
    };
  });
};

// 计算cols
const calcuCols = () => {
  // 列数初始化
  let waterfallWidth: number = props.width ? props.width : window.innerWidth;
  let cols = Math.max(waterfallWidth / colWidth.value, 1);
  return isMobile.value ? 2 : Math.min(cols, props.maxCols);
};

// waterfall布局
const waterfall = () => {
  imgBoxEls.value = document.getElementsByClassName(
    "img-box"
  ) as HTMLCollectionOf<Element>;
  console.log("imgBoxEls", imgBoxEls.value);
  if (!imgBoxEls.value) return;
  let top,
    left,
    height,
    _colWidth = colWidth.value;

  if (beginIndex.value == 0) colsHeightArr.value = [];
  for (let i = beginIndex.value; i < props.imgsArr.length; i++) {
    if (!imgBoxEls.value[i]) return;
    height = imgBoxEls.value[i].offsetHeight;
    if (i < cols.value) {
      colsHeightArr.value.push(height);
      top = 0;
      left = i * _colWidth;
    } else {
      let minHeight = Math.min.apply(null, colsHeightArr.value); // 最低高低
      let minIndex = colsHeightArr.value.indexOf(minHeight); // 最低高度的索引
      top = minHeight;
      left = minIndex * _colWidth;
      // 设置元素定位的位置
      // 更新colsHeightArr
      colsHeightArr.value[minIndex] = minHeight + height;
    }
    imgBoxEls.value[i].style.left = left + "px";
    imgBoxEls.value[i].style.top = top + "px";
  }
  beginIndex.value = props.imgsArr.length; // 排列完之后，新增图片从这个索引开始预加载图片和排列
};

// resize 响应式
const response = () => {
  let old = cols.value;
  cols.value = calcuCols();
  if (old === cols.value) return; // 列数不变直接退出
  beginIndex.value = 0; // 开始排列的元素索引
  waterfall();
};

const scrollEl = ref();
// 滚动触底事件
const scrollFn = () => {
  //如果正在预加载
  if (isPreloading.value) return;
  let minHeight = Math.min.apply(null, colsHeightArr.value);
  if (
    scrollEl.value.scrollTop + scrollEl.value.offsetHeight >
    minHeight - props.reachBottomDistance
  ) {
    isPreloading.value = true;
    emits("scrollReachBottom", "click");
  }
};

const scroll = () => {
  scrollEl.value.addEventListener("scroll", scrollFn);
};
const handleClickImage = (e: Event, data: any) => {
  emits("click", e, data);
};

// 下拉时间
// ==7== 下拉事件
const pullDown = () => {
  let scrollEl: any = document.querySelector(".vue-waterfall-scroll");
  let startY: any;
  scrollEl.addEventListener("touchmove", (e: any) => {
    if (scrollEl.scrollTop === 0) {
      let t = e.changedTouches[0];
      if (!startY) startY = t.pageY;
      let pullDownDistance = t.pageY - startY;
      if (pullDownDistance > 0) {
        e.preventDefault();
      }
      emits("pullDownMove", pullDownDistance);
    }
  });
  scrollEl.addEventListener("touchend", (e: any) => {
    if (scrollEl.scrollTop === 0) {
      startY = NaN;
      emits("pullDownEnd");
    }
  });
};

//

const reset = () => {
  imgsArr_c.value = [];
  beginIndex.value = 0;
  loadedCount.value = 0;
  isFirstLoad.value = true;
  isPreloading.value = true;
};

onMounted(() => {
  isMobile.value = isMobileFn();

  preload();
  cols.value = calcuCols();
  // this.$on("preloaded", () => {
  //   isFirstLoad.value = false;
  //   imgsArr_c.value = props.imgsArr.concat([]); // 预加载完成，这时才开始渲染
  //   nextTick(() => {
  //     isPreloading.value = false;
  //     waterfall();
  //   })
  // });
  if (!isMobile.value && !props.width) {
    window.addEventListener("resize", response);
  }
  if (isMobile.value && props.enablePullDownEvent) pullDown();
  scroll();
});
</script>

<style lang="less">
@keyframes loading {
  50% {
    opacity: 0.2;
    transform: scale(0.75);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.vue-waterfall-container {
  width: 100%;
  height: 100%;
  position: relative;

  .vue-waterfall-scroll {
    position: relative;
    width: 100%;
    height: 100%;
    overflow-x: hidden;
    overflow-y: scroll;
    -webkit-overflow-scrolling: touch;
  }

  .vue-waterfall {
    position: absolute;
    width: 100%;

    @keyframes show-card {
      0% {
        transform: scale(0.5);
      }
      100% {
        transform: scale(1);
      }
    }

    .img-box {
      position: absolute;
      box-sizing: border-box;
      width: 50%; //移动端生效

      &.default-card-animation {
        animation: show-card 0.4s;
        transition: left 0.6s, top 0.6s;
        transition-delay: 0.1s;
      }

      .img-inner-box {
        // box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        display: block;

        & > img {
          width: 100%;
          display: block;
          border: none;
        }
      }

      &.__err__ {
        .img-inner-box {
          background-image: url(data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/4QMraHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjMtYzAxMSA2Ni4xNDU2NjEsIDIwMTIvMDIvMDYtMTQ6NTY6MjcgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjk1M0JCM0QwNkVFNDExRThCNTJCQUQ2RDFGQzg0NzIxIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjk1M0JCM0NGNkVFNDExRThCNTJCQUQ2RDFGQzg0NzIxIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDUzYgKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QTYwRUMyMDE2RUUzMTFFOEJCRTU5RTFDODg1ODgwMjYiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QTYwRUMyMDI2RUUzMTFFOEJCRTU5RTFDODg1ODgwMjYiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7/7gAOQWRvYmUAZMAAAAAB/9sAhAAQCwsLDAsQDAwQFw8NDxcbFBAQFBsfFxcXFxcfHhcaGhoaFx4eIyUnJSMeLy8zMy8vQEBAQEBAQEBAQEBAQEBAAREPDxETERUSEhUUERQRFBoUFhYUGiYaGhwaGiYwIx4eHh4jMCsuJycnLis1NTAwNTVAQD9AQEBAQEBAQEBAQED/wAARCACRAJEDASIAAhEBAxEB/8QAZQAAAwEBAQAAAAAAAAAAAAAAAAIDAQQHAQEAAAAAAAAAAAAAAAAAAAAAEAACAQMDBAEFAAMBAAAAAAAAAQIRMQMhQRJRYYEycZHBIkITsdFSYhEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A9AAAAAMFnNQWt9kAwkssVbV9CTnKb10XQVtLSyAd5ZuzURW27yfhmX9RlDI+wD4Vf/ZVi41SKCdeNI3YEnOXJtOiBZZr/wBGcMi2Ft7AXjli76PoOcqael0Mpyg9NV0A6QEhNTWl90MBoAAAAAAGGiTlxjXfZAZkycdEqyI3q26sOrd92CTm6bbsA1boh1i3lqPGKiqIZAYklYHY0x6tIDY2B3NdjEBgNJ3NACTxbx0E1TozoYsoqSowI2o06MtjyctGqSItODptsw6NX2YHSaJCXKNd90OAAAAYznnLnJvZWK5pUjRXloiNdwCjk0l9S0YqKohcSpGrvLUcDUBLK23x23FWNtVSAuHch/KXQP5PoBdqq77GJ1XfczFVKjVBcuPk6rXqBQCH8n0D+UugFwZD+bV1oNif5OOzQDyipKjI0cW0/qXYmVVjVXjqAkZcHXZ3OhHNXcthlWNHeOjAoAABDLKs6bISlWl1Busm+42Jfm30At2BmI1gRy+3gpD1XwTy+3gpH1QDASyt8uKdFuJRw1iwOjdBKy+TIutGbK3kAAxtJNuwiywdmA7s/glj9/BV04unQli9l8AWDsBjAhSja6D4pUnTZmZV+afUVOkk+4HUBgAc0bD4v2+fsJGw+L9vn7AVQMEDAjl9vBSHqvgnl9vBSHqvgDJwbfJC8JPSlEO5wTo3qMnUDEqNGz0jXoD08BRSXyBB/m6u2xvFPQ1qjoDAVNxqv1ZuJUnT5BGw9/AFQYAwJZf1+fsJKw+X9fn7CSsB0AAAc7VG13GxP82uoZFSbezFWkkwOgGCBgRy15adDZTaioq7QZPfwZQDFFfPc2MnB0vE1AwCc+WituPjaS4kzU6agPkS9hEVeqJJU0AAh7+ACHv4AqAAwI5X+aXQVKrS7g3WTY2ONZp7IC9AAAJ5lWNf+dSV1XqdL1VGc8lxk47bAUxyqqO60GIpuL5LyuxZNNVVtmAmVfkpbbi1RYAI1QVRYAI1QJ1aRYzdAbJ8Y1I1RZggI1SNxL8uW1NCoAYxckqKiu9Bm0lV23ZFtyfJ+F2Ayyr0K4VSNf8ArUnFcpKO250LRUQABoAYLkhzXdWHMA5u26uNGXF9tx8uOusfYlbTcC6aaqrdTTnTlHVfQrHJF6PRsBwAAC5i9vg0xbgaAIAAxtJVduosskVotWiTcpav6ANKXJ9the27sF9NyuLHTWXsA2OHBd3cYDQAAAAAAAwSeNS1syhgHNRxdJfUK10ujoaTuJLCrp0Amm1Ztdhv6z3Sfkxwmu4leqoBT+1P1f8AkZy4469daEaopllRqPRAH9ZOyp5Fbbu2+xmuyGUJvsAtaaWQUcnSP1Kxwq7dR0krALDGo63Y4GgAAAAAAAAAAAAAAAAAshJ7AAGK6B3YABsNx4gADAAAAAAAAAAAAAf/2Q==);
          background-repeat: no-repeat;
          background-position: center;
          background-size: 50% 50%;

          & > img {
            display: none;
          }
        }
      }
    }
  }

  > .loading {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 6px;
    z-index: 999;

    &.first {
      bottom: 50%;
      transform: translate(-50%, 50%);
    }

    &.ball-beat {
      > .dot {
        vertical-align: bottom;
        background-color: #4b15ab;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin: 3px;
        animation-fill-mode: both;
        display: inline-block;
        animation: loading 0.7s 0s infinite linear;

        &:nth-child(2n-1) {
          animation-delay: 0.35s;
        }
      }
    }
  }
}
</style>

import { PropType } from "vue"

export interface ImgArr {
    src: string
    href: string
    info: string
    headerText?: string
    _height?: number
    _error?: boolean
}

export const propsParams = {
    // 容器宽度
    width: {
        type: Number
    },
    // 容器高度
    height: {
        type: [Number]
    },
    // loading 点数
    loadingDotCount: {
        type: Number,
        default: 3
    },
    loadingDotStyle: {
        type: Object
    },
    srcKey: {
        type: String,
        default: "src",
    },
    imgWidth: {
        type: Number,
        default: 240,
    },
    gap: {
        // .img-box 间距
        type: Number,
        default: 20,
    },
    mobileGap: {
        type: Number,
        default: 8,
    },
    imgsArr: {
        type: Array as PropType<ImgArr []>,
        required: true,
        default: () => [{}]
    },
    maxCols: {
        type: Number,
        default: 5,
    },
    cardAnimationClass: {
        type: [String],
        default: "default-card-animation",
    },
    cardClass: {
        type: [String],
        default: "",
    },
    enablePullDownEvent: {
        type: Boolean,
        default: false,
    },
    reachBottomDistance: {
        // 滚动触底距离，触发加载新图片
        type: Number, // selector
        default: 20, // 默认在最低那一列到底时触发
    },
}
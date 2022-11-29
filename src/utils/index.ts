export const isMobileFn = () => {
    return !!navigator.userAgent.match(/(iPhone|iPod|Android|ios)/i)
}
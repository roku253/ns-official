type ImeKeyEvent = {
  isComposing?: boolean
  keyCode?: number
  nativeEvent?: { isComposing?: boolean; keyCode?: number }
}

/** 日本語IMEの変換確定 Enter。このとき送信しない。 */
export function isImeConfirmEnter(event: ImeKeyEvent): boolean {
  const native = event.nativeEvent
  return (
    event.isComposing === true ||
    native?.isComposing === true ||
    event.keyCode === 229 ||
    native?.keyCode === 229
  )
}

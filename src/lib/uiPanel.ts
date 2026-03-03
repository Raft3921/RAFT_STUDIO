export interface PanelParts {
  panel_tl?: CanvasImageSource
  panel_top?: CanvasImageSource
  panel_tr?: CanvasImageSource
  panel_left?: CanvasImageSource
  panel_center?: CanvasImageSource
  panel_right?: CanvasImageSource
  panel_bl?: CanvasImageSource
  panel_bottom?: CanvasImageSource
  panel_br?: CanvasImageSource
}

export interface TabParts {
  tab_left?: CanvasImageSource
  tab_center?: CanvasImageSource
  tab_right?: CanvasImageSource
}

type UiPartName = keyof PanelParts | keyof TabParts

const partCache: Partial<Record<UiPartName, HTMLImageElement>> = {}

const isImageReady = (source?: CanvasImageSource): source is CanvasImageSource => {
  if (!source) return false
  if (source instanceof HTMLImageElement) {
    return source.complete && source.naturalWidth > 0 && source.naturalHeight > 0
  }
  return true
}

const sourceSize = (source: CanvasImageSource) => {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight }
  }
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height }
  }
  if (source instanceof ImageBitmap) {
    return { width: source.width, height: source.height }
  }
  if (source instanceof OffscreenCanvas) {
    return { width: source.width, height: source.height }
  }
  return { width: 1, height: 1 }
}

const drawTiled = (
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  if (w <= 0 || h <= 0) return
  const { width: sw, height: sh } = sourceSize(source)
  if (sw <= 0 || sh <= 0) return

  for (let yy = y; yy < y + h; yy += sh) {
    for (let xx = x; xx < x + w; xx += sw) {
      const dw = Math.min(sw, x + w - xx)
      const dh = Math.min(sh, y + h - yy)
      ctx.drawImage(source, 0, 0, dw, dh, xx, yy, dw, dh)
    }
  }
}

const resolvePartPath = (name: UiPartName, basePath: string) => `${basePath}/${name}.png`

const loadPart = (name: UiPartName, basePath: string) => {
  if (typeof Image === 'undefined') return
  if (partCache[name]) return
  const image = new Image()
  image.src = resolvePartPath(name, basePath)
  partCache[name] = image
}

export const preloadUiPanelAssets = (basePath = `${import.meta.env.BASE_URL}panel`) => {
  const panelNames: UiPartName[] = [
    'panel_tl',
    'panel_top',
    'panel_tr',
    'panel_left',
    'panel_center',
    'panel_right',
    'panel_bl',
    'panel_bottom',
    'panel_br',
  ]

  panelNames.forEach((name) => loadPart(name, basePath))
}

export const preloadUiTabAssets = (basePath = `${import.meta.env.BASE_URL}panel`) => {
  const tabNames: UiPartName[] = ['tab_left', 'tab_center', 'tab_right']
  tabNames.forEach((name) => loadPart(name, basePath))
}

const getPanelParts = (): PanelParts => ({
  panel_tl: partCache.panel_tl,
  panel_top: partCache.panel_top,
  panel_tr: partCache.panel_tr,
  panel_left: partCache.panel_left,
  panel_center: partCache.panel_center,
  panel_right: partCache.panel_right,
  panel_bl: partCache.panel_bl,
  panel_bottom: partCache.panel_bottom,
  panel_br: partCache.panel_br,
})

export const drawUiPanel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  parts: PanelParts = getPanelParts(),
) => {
  const iw = {
    tl: isImageReady(parts.panel_tl) ? sourceSize(parts.panel_tl).width : 0,
    tr: isImageReady(parts.panel_tr) ? sourceSize(parts.panel_tr).width : 0,
    bl: isImageReady(parts.panel_bl) ? sourceSize(parts.panel_bl).width : 0,
    br: isImageReady(parts.panel_br) ? sourceSize(parts.panel_br).width : 0,
  }

  const ih = {
    tl: isImageReady(parts.panel_tl) ? sourceSize(parts.panel_tl).height : 0,
    tr: isImageReady(parts.panel_tr) ? sourceSize(parts.panel_tr).height : 0,
    bl: isImageReady(parts.panel_bl) ? sourceSize(parts.panel_bl).height : 0,
    br: isImageReady(parts.panel_br) ? sourceSize(parts.panel_br).height : 0,
  }

  const leftW = Math.max(iw.tl, iw.bl)
  const rightW = Math.max(iw.tr, iw.br)
  const topH = Math.max(ih.tl, ih.tr)
  const bottomH = Math.max(ih.bl, ih.br)

  const innerX = x + leftW
  const innerY = y + topH
  const innerW = Math.max(0, w - leftW - rightW)
  const innerH = Math.max(0, h - topH - bottomH)

  if (isImageReady(parts.panel_center)) {
    drawTiled(ctx, parts.panel_center, innerX, innerY, innerW, innerH)
  } else {
    ctx.fillStyle = '#2a2d33'
    ctx.fillRect(innerX, innerY, innerW, innerH)
  }

  if (isImageReady(parts.panel_top)) {
    ctx.drawImage(parts.panel_top, innerX, y, innerW, topH)
  } else if (isImageReady(parts.panel_center)) {
    drawTiled(ctx, parts.panel_center, innerX, y, innerW, topH)
  }

  if (isImageReady(parts.panel_bottom)) {
    ctx.drawImage(parts.panel_bottom, innerX, y + h - bottomH, innerW, bottomH)
  } else if (isImageReady(parts.panel_center)) {
    drawTiled(ctx, parts.panel_center, innerX, y + h - bottomH, innerW, bottomH)
  }

  if (isImageReady(parts.panel_left)) {
    ctx.drawImage(parts.panel_left, x, innerY, leftW, innerH)
  } else if (isImageReady(parts.panel_center)) {
    drawTiled(ctx, parts.panel_center, x, innerY, leftW, innerH)
  }

  if (isImageReady(parts.panel_right)) {
    ctx.drawImage(parts.panel_right, x + w - rightW, innerY, rightW, innerH)
  } else if (isImageReady(parts.panel_center)) {
    drawTiled(ctx, parts.panel_center, x + w - rightW, innerY, rightW, innerH)
  }

  if (isImageReady(parts.panel_tl)) {
    ctx.drawImage(parts.panel_tl, x, y, leftW, topH)
  }
  if (isImageReady(parts.panel_tr)) {
    ctx.drawImage(parts.panel_tr, x + w - rightW, y, rightW, topH)
  }
  if (isImageReady(parts.panel_bl)) {
    ctx.drawImage(parts.panel_bl, x, y + h - bottomH, leftW, bottomH)
  }
  if (isImageReady(parts.panel_br)) {
    ctx.drawImage(parts.panel_br, x + w - rightW, y + h - bottomH, rightW, bottomH)
  }

  if (!isImageReady(parts.panel_center)) {
    ctx.strokeStyle = '#4b5563'
    ctx.strokeRect(x, y, w, h)
  }
}

export const drawUiTab = (
  ctx: CanvasRenderingContext2D,
  parts: TabParts,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  const left = isImageReady(parts.tab_left) ? parts.tab_left : undefined
  const center = isImageReady(parts.tab_center) ? parts.tab_center : undefined
  const right = isImageReady(parts.tab_right) ? parts.tab_right : undefined

  if (!left || !center || !right) {
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = '#9ca3af'
    ctx.strokeRect(x, y, w, h)
    return
  }

  const leftW = sourceSize(left).width
  const rightW = sourceSize(right).width
  const centerW = Math.max(0, w - leftW - rightW)

  ctx.drawImage(left, x, y, leftW, h)
  drawTiled(ctx, center, x + leftW, y, centerW, h)
  ctx.drawImage(right, x + w - rightW, y, rightW, h)
}

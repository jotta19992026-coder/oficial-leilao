"""Recompõe as artes RIZA/Daycoval (1000x400) e Pan (1140x297) nos quadros do banner Bradesco:
desktop 1140x297 e mobile 780x747. Uso: python recompose.py <pasta images> <pasta saida>"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

IMG, OUT = sys.argv[1], sys.argv[2]
DW, DH = 1140, 297
MW, MH = 780, 747


def cover(im, w, h, ax=0.5, ay=0.5):
    s = max(w / im.width, h / im.height)
    r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = round((r.width - w) * ax); y = round((r.height - h) * ay)
    return r.crop((x, y, x + w, y + h))


def poly_mask(size, poly, feather=2):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather)) if feather else m


def white_zone_mask(im, box, light=212, gap=46):
    """Máscara da área branca curva (com o logo) no canto inferior direito."""
    x0, y0, x1, y1 = box
    m = Image.new('L', im.size, 0); d = ImageDraw.Draw(m)
    px = im.load(); starts = []
    for y in range(y0, y1):
        dark = 0; start = x1
        for x in range(x1 - 1, x0 - 1, -1):
            r, g, b = px[x, y]
            if min(r, g, b) >= light: dark = 0; start = x
            else:
                dark += 1
                if dark > gap: break
        starts.append(start)
    # suaviza a borda (mediana móvel) para não serrilhar
    k = 9; sm = []
    for i in range(len(starts)):
        w = sorted(starts[max(0, i - k):i + k + 1]); sm.append(w[len(w) // 2])
    # a borda deve ser monotônica (curva abrindo para baixo)
    for i in range(1, len(sm)): sm[i] = min(sm[i], sm[i - 1] + 2)
    for i, y in enumerate(range(y0, y1)):
        if sm[i] < x1 - 2: d.line([(sm[i], y), (x1, y)], fill=255)
    return m.filter(ImageFilter.GaussianBlur(1.5))


def badge_mask(W, H, bx):
    m = Image.new('L', (W, H), 0)
    r = (bx[3] - bx[1]) // 2
    ImageDraw.Draw(m).rounded_rectangle(bx, radius=r, fill=255)
    return m.filter(ImageFilter.GaussianBlur(0.6))


def row_gradient(im, x0, x1, w, h):
    """Fundo liso a partir da média de cada linha de uma faixa sem texto do painel."""
    strip = im.crop((x0, 0, x1, im.height)).resize((1, im.height), Image.BOX)
    strip = strip.filter(ImageFilter.GaussianBlur(3))
    return strip.resize((w, h), Image.BICUBIC)


ARTS = {
    'riza': dict(src='Banner-2026-10-26-11h00-RIZA-AF1.webp',
                 chevron=[(0, 0), (428, 0), (532, 197), (428, 400), (0, 400)],
                 photo=(540, 60, 1000, 262),
                 photo_m=(540, 64, 1000, 262),
                 badge=(792, 29, 966, 60),
                 white=(560, 230, 1000, 400)),
    'daycoval': dict(src='Banner-2026-11-05-12h00-Daycoval-.webp',
                     chevron=[(0, 0), (425, 0), (532, 192), (420, 400), (0, 400)],
                     photo=(540, 0, 1000, 250),
                     photo_m=(540, 0, 1000, 250),
                     badge=None,
                     white=(560, 230, 1000, 400)),
}


def compose_property(name, a):
    src = Image.open(f'{IMG}/{a["src"]}').convert('RGB')
    W, H = src.size
    panel_mask = poly_mask((W, H), a['chevron'], 1)
    wmask = white_zone_mask(src, a['white'])
    wbox = wmask.getbbox()

    # ---- desktop 1140x297: painel e logo na escala da altura, foto estendida ----
    s = DH / H
    c = Image.new('RGB', (DW, DH))
    px0 = round(300)
    c.paste(cover(src.crop(a['photo']), DW - px0, DH, 0.5, 0.45), (px0, 0))
    def put(region_mask, box, dx, dy, scale, canvas):
        crop = src.crop(box); mk = region_mask.crop(box)
        sz = (round(crop.width * scale), round(crop.height * scale))
        canvas.paste(crop.resize(sz, Image.LANCZOS), (dx, dy), mk.resize(sz, Image.LANCZOS))
    put(panel_mask, (0, 0, 540, H), 0, 0, s, c)
    # área branca + logo, ancorada no canto inferior direito
    bw, bh = wbox[2] - wbox[0], wbox[3] - wbox[1]
    put(wmask, wbox, DW - round(bw * s), DH - round(bh * s), s, c)
    if a['badge']:
        bx = a['badge']
        put(badge_mask(W, H, bx), bx, DW - round((W - bx[0]) * s), round(bx[1] * s), s, c)
    c.save(f'{OUT}/banner-{name}.webp', quality=90, method=6)

    # ---- mobile 780x747: texto em cima, foto embaixo (como o Bradesco mobile) ----
    TOP = 400
    m = Image.new('RGB', (MW, MH))
    m.paste(row_gradient(src, 0, 24, MW, TOP), (0, 0))
    # painel em escala 1, centralizado, com bordas esfumadas para fundir ao gradiente
    pm = poly_mask((W, H), [(x - 22 if x > 0 else x, y) for x, y in a['chevron']], 0)
    fade = Image.new('L', (W, H), 0); fd = ImageDraw.Draw(fade)
    for x in range(0, 60): fd.line([(x, 0), (x, H)], fill=round(255 * x / 60))
    fd.rectangle([60, 0, W, H], fill=255)
    pm = ImageChops.multiply(pm, fade).filter(ImageFilter.GaussianBlur(10))
    # reforça a área do texto (não esfumar letras)
    ch = a['chevron']
    core = poly_mask((W, H), [(40, 0), (ch[1][0] - 6, 0), (ch[2][0] - 6, ch[2][1]), (ch[3][0] - 6, H), (40, H)], 4)
    pm = ImageChops.lighter(pm, core)
    off = (MW - 540) // 2 + 10
    m.paste(src.crop((0, 0, 540, H)), (off, 0), pm.crop((0, 0, 540, H)))
    BOT = MH - TOP
    m.paste(cover(src.crop(a['photo_m']), MW, BOT, 0.5, 0.4), (0, TOP))
    ms = 1.0
    crop = src.crop(wbox); mk = wmask.crop(wbox)
    m.paste(crop, (MW - crop.width, MH - crop.height), mk)
    if a['badge']:
        bx = a['badge']; bc = src.crop(bx)
        m.paste(bc, (MW - bc.width - 18, TOP + 20), badge_mask(W, H, bx).crop(bx))
    # filete de separação discreto, como no Bradesco mobile
    ImageDraw.Draw(m).line([(0, TOP), (MW, TOP)], fill=(255, 255, 255), width=3)
    m.save(f'{OUT}/banner-{name}-mobile.webp', quality=90, method=6)


for n, a in ARTS.items():
    compose_property(n, a)
print('ok')


def flatten_bg(crop, target):
    """O fundo do Pan escurece para a esquerda (56→68); corrige o recorte coluna a coluna
    para o tom liso do quadro mobile, evitando 'caixas' visíveis em volta dos blocos."""
    px = crop.load(); w, h = crop.size
    def edge(x):
        vals = sorted(px[x, y][0] for y in (0, 1, h - 2, h - 1))
        return vals[1]
    left, right = edge(1), edge(w - 2)
    add = Image.new('RGB', (w, h)); sub = Image.new('RGB', (w, h))
    da, ds = ImageDraw.Draw(add), ImageDraw.Draw(sub)
    for x in range(w):
        diff = round(target - (left + (right - left) * x / max(1, w - 1)))
        if diff > 0: da.line([(x, 0), (x, h)], fill=(diff,) * 3)
        elif diff < 0: ds.line([(x, 0), (x, h)], fill=(-diff,) * 3)
    return ImageChops.subtract(ImageChops.add(crop, add), sub)


def compose_pan_mobile():
    """Pan: arte já é 1140x297 no desktop; no mobile os blocos são reempilhados num quadro 780x747."""
    src = Image.open(f'{IMG}/web-1e63dc7f3f.webp').convert('RGB')
    BG = 64
    m = Image.new('RGB', (MW, MH), (BG, BG, BG))
    blue = (2, 175, 255); d = ImageDraw.Draw(m)
    for box in [(0, 0, 70, 22), (MW - 46, 120, MW, 190), (0, 600, 24, 660), (MW - 60, MH - 30, MW, MH)]:
        d.rectangle(box, fill=blue)

    def place(box, cx, y, scale, feather=10):
        crop = flatten_bg(src.crop(box), BG)
        sz = (round(crop.width * scale), round(crop.height * scale))
        crop = crop.resize(sz, Image.LANCZOS)
        mk = Image.new('L', sz, 0)
        ImageDraw.Draw(mk).rectangle([feather, feather, sz[0] - feather, sz[1] - feather], fill=255)
        mk = mk.filter(ImageFilter.GaussianBlur(feather / 2))
        m.paste(crop, (round(cx - sz[0] / 2), y), mk)
        return y + sz[1]

    # "Leilão de veículos" e logo Banco Pan recortados separados (há um quadrado azul acima do logo)
    place((20, 56, 202, 146), MW / 2 - 136, 30, 1.45, 14)
    y = place((202, 72, 388, 146), MW / 2 + 132, 30 + round(16 * 1.45), 1.45, 5)
    place((70, 148, 210, 248), MW / 2 - 105, y + 6, 1.35, 14)     # Possibilidade de financiar + B2Capital
    y = place((222, 144, 336, 252), MW / 2 + 110, y + 6, 1.35, 14)  # selo IPVA 2026 pago
    y = place((400, 16, 1138, 222), MW / 2, y + 4, 1.0, 14)   # veículos
    y = place((444, 236, 768, 280), MW / 2, y + 8, 1.35, 6)   # Online segunda 9h30
    y = place((784, 236, 1070, 280), MW / 2, y + 2, 1.35, 6)  # Online sexta 14h
    place((100, 258, 336, 280), MW / 2, MH - 34, 1.25, 4)     # aviso de imagem ilustrativa
    m.save(f'{OUT}/banner-pan-mobile.webp', quality=90, method=6)


compose_pan_mobile()

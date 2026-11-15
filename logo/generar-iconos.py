"""
Genera los íconos PNG de la app a partir del logo elegido (K · solo la C).

Dibuja las mismas formas que logo/k-solo-c.svg, porque en este computador
no hay una herramienta que convierta SVG a PNG. Si cambia el SVG, hay que
cambiar las medidas aquí también.

Uso (desde la carpeta del proyecto):  python logo/generar-iconos.py
"""
import math
import os
from PIL import Image, ImageChops, ImageDraw

OSCURO = (11, 15, 21)        # #0b0f15
AZUL = (43, 111, 245)        # #2b6ff5
VERDE = (68, 243, 169)       # #44f3a9
LIENZO = 512                 # medidas del SVG
SUAVIZADO = 4                # se dibuja 4 veces más grande y se reduce: bordes lisos

AQUI = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(AQUI, '..', 'public')


def degradado(lado):
    """Azul abajo a la izquierda, verde arriba a la derecha (igual que el SVG: de 60,452 a 452,60)."""
    n = 128
    chico = Image.new('RGB', (n, n))
    px = []
    for y in range(n):
        for x in range(n):
            sx, sy = x / (n - 1) * LIENZO, y / (n - 1) * LIENZO
            t = ((sx - 60) * 392 + (sy - 452) * -392) / (392 * 392 * 2)
            t = min(1, max(0, t))
            px.append(tuple(round(a + (b - a) * t) for a, b in zip(AZUL, VERDE)))
    chico.putdata(px)
    return chico.resize((lado, lado), Image.BILINEAR)


def marca(lado, escala=1.0):
    """Máscara en blanco de la marca: una C abrazando un balón. `escala` la achica hacia el centro."""
    k = lado / LIENZO * escala
    d = (lado - LIENZO * k) / 2
    T = lambda x, y: (x * k + d, y * k + d)
    caja = lambda cx, cy, r: [*T(cx - r, cy - r), *T(cx + r, cy + r)]

    m = Image.new('L', (lado, lado), 0)
    g = ImageDraw.Draw(m)
    grosor = 50

    # C: arco con centro (256,256) y radio 150, abierto a la derecha.
    g.arc(caja(256, 256, 150 + grosor / 2), 38, 322, fill=255, width=round(grosor * k))

    # Balón dentro de la C: disco con pentágono central, costuras y parches calados.
    cx, cy, R = 256, 256, 86
    disco = Image.new('L', (lado, lado), 0)
    ImageDraw.Draw(disco).ellipse(caja(cx, cy, R), fill=255)
    calado = Image.new('L', (lado, lado), 0)
    c = ImageDraw.Draw(calado)
    ancho = max(1, round(R * 0.085 * k))
    punto = lambda r, grados: T(cx + r * math.cos(math.radians(grados)), cy + r * math.sin(math.radians(grados)))

    def poligono(puntos):
        c.polygon(puntos, fill=255)
        c.line(puntos + [puntos[0]], fill=255, width=ancho, joint='curve')

    poligono([punto(R * 0.34, -90 + 72 * i) for i in range(5)])
    for i in range(5):
        a = -90 + 72 * i
        c.line([punto(R * 0.34, a), punto(R * 0.70, a)], fill=255, width=ancho)
        poligono([punto(R * 0.70, a), punto(R * 1.15, a - 21), punto(R * 1.15, a + 21)])

    balon = ImageChops.subtract(disco, calado)
    return ImageChops.lighter(m, balon)


def icono(lado, redondeado=True, escala=1.0):
    """Ícono final: fondo oscuro y marca en degradado."""
    grande = lado * SUAVIZADO
    img = Image.new('RGBA', (grande, grande), OSCURO + (255,))
    img.paste(degradado(grande), (0, 0), marca(grande, escala))
    if redondeado:
        forma = Image.new('L', (grande, grande), 0)
        ImageDraw.Draw(forma).rounded_rectangle([0, 0, grande - 1, grande - 1], radius=112 / LIENZO * grande, fill=255)
        img.putalpha(forma)
    return img.resize((lado, lado), Image.LANCZOS)


def guardar(img, nombre):
    ruta = os.path.join(PUBLIC, nombre)
    img.save(ruta, optimize=True)
    print(f'{nombre}: {img.size[0]}x{img.size[1]}, {os.path.getsize(ruta) // 1024} KB')


if __name__ == '__main__':
    guardar(icono(512), 'logo.png')                                   # logo dentro de la app
    guardar(icono(192), 'icon-192.png')                               # app instalada
    guardar(icono(512), 'icon-512.png')
    # Android recorta este a su gusto: sin esquinas y con la marca más chica.
    guardar(icono(512, redondeado=False, escala=0.74), 'icon-maskable-512.png')
    # iPhone redondea solo y no acepta transparencia.
    guardar(icono(180, redondeado=False, escala=0.86).convert('RGB'), 'apple-touch-icon.png')

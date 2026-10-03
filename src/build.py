#!/usr/bin/env python3
"""Ensambla index.html (GitHub Pages) a partir de las piezas de src/."""
import re, pathlib
here = pathlib.Path(__file__).parent
head = (here/'a_head.html').read_text(encoding='utf-8')
js = ''.join((here/f).read_text(encoding='utf-8') for f in ('b_logic.js','c_scene.js','d_ui.js'))
title = re.search(r'<title>.*?</title>', head).group(0)
body = head.replace(title, '', 1)
fav = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231e6b57'/%3E%3Cpath d='M9 8h14l-3 7h-8zM13 17h6v7h-6z' fill='%23fff'/%3E%3C/svg%3E"
html = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{title}
<meta name="description" content="Simulador 3D interactivo del dispensador automático de alimento FeederBox.">
<link rel="icon" href="{fav}">
<style>:root{{color-scheme:light;padding-block:env(safe-area-inset-top,0px) env(safe-area-inset-bottom,0px)}}body{{margin:0}}[hidden]{{display:none!important}}</style>
</head>
<body>
{body}
<script src="vendor/three.min.js"></script>
<script>
(function(){{'use strict';
{js}
}})();
</script>
</body>
</html>
'''
out = here.parent/'index.html'
out.write_text(html, encoding='utf-8')
print('escrito', out, len(html)//1024, 'KB')

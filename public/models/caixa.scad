module render() {
  difference() {
    cube([largura, comprimento, altura]);

    translate([espessura, espessura, espessura])
      cube([
        largura - 2*espessura,
        comprimento - 2*espessura,
        altura
      ]);
  }

  if (tem_tampa == 1) {
    translate([0,0,altura])
      cube([largura, comprimento, espessura]);
  }
}
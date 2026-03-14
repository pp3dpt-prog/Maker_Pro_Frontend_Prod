$fn = 100;
altura = 3;

// O difference() principal deve envolver a peça toda
difference() {
    // 1. TUDO O QUE QUERES MANTER (Base + Argola + Nome em Relevo)
    union() {
        cylinder(h=altura, r=18); // Círculo Base
    
        // Argola
        translate([0, 20, 0]) 
        difference() {
            cylinder(h=altura, r=6);
            translate([0, 0, -1]) cylinder(h=altura+2, r=3);
        }
            
        // Nome em Relevo (Frente)
        translate([0, 0, altura]) 
        linear_extrude(height=1.2) 
        text("Pedro", size=4, halign="center", valign="center", font="Liberation Sans:style=Bold");
    }
        
    // 2. TUDO O QUE QUERES REMOVER (Telefone no verso)
    // Viramos o sistema para o verso e removemos massa
 // 2. TUDO O QUE QUERES REMOVER (Telefone no verso)
            translate([0, 0, -2.1]) mirror([1,0,0]) {
            linear_extrude(height=3.2) 
            text("961028106", size=3.5, halign="center", valign="center", font="Liberation Sans:style=Bold");
        
            }
$fn = 60;
altura = 3;

module coracao_base_cubo() {
    union() {
        // As duas metades superiores (arredondadas para formar o topo do coração)
        translate([-5, 5, 0]) cylinder(h = altura, r = 7);
        translate([5, 5, 0]) cylinder(h = altura, r = 7);
        
        // O Bico: um cubo rodado a 45 graus para criar uma ponta geométrica
        translate([0, -9.65, 0]) 
        rotate([0, 0, 45]) 
        cube([13.5, 13, altura], center = false);
    }
}

// Junta a forma com a argola física
union() {
    coracao_base_cubo();
    
    // Argola integrada no topo (também com aspeto robusto)
    translate([0, 13, 0]) 
    difference() {
        cylinder(h = 2.5, r = 5.5, center = false);
        translate([0, 0, -1]) cylinder(h = altura + 2, r = 2.5);
    }
}
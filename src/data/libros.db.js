// "Base de datos" de libros en memoria (se pierde al reiniciar el servidor)

// Datos iniciales, los dejo aparte para poder reiniciar sin repetir el arreglo

const librosIniciales = [
    {
        id: 1,
        titulo: "Cien años de soledad",
        autor: "Gabriel García Márquez",
        genero: "Realismo mágico",
        anio: 1967,
        precio: 18.99
    },
    {
        id: 2,
        titulo: "El Principito",
        autor: "Antoine de Saint-Exupéry",
        genero: "Fábula",
        anio: 1943,
        precio: 9.99
    },
    {
        id: 3,
        titulo: "1984",
        autor: "George Orwell",
        genero: "Ciencia ficción",
        anio: 1949,
        precio: 14.5
    },
    {
        id: 4,
        titulo: "Don Quijote de la Mancha",
        autor: "Miguel de Cervantes",
        genero: "Novela",
        anio: 1605,
        precio: 22.0
    }
];


// Este es el arreglo que usan las rutas
// Uso let/export para poder importarlo, pero siempre se modifica con push/splice (nunca se reasigna)

export let libros = librosIniciales.map((libro) => ({ ...libro }));


// Deja el arreglo como al inicio, sirve para las pruebas
// Uso length = 0 en vez de libros = [] porque así no se pierde la referencia que importaron las rutas
// Copio cada libro con {...libro} para que los cambios no dañen los datos iniciales

export function reiniciarLibros() {
    libros.length = 0;
    libros.push(...librosIniciales.map((libro) => ({ ...libro })));
    return libros;
}

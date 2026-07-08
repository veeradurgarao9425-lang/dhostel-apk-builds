const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
console.log('Test a@b.c:', regex.test('a@b.c'));
console.log('Test valid:', regex.test('test@example.com'));
console.log('Test invalid1:', regex.test('test@example'));
console.log('Test invalid2:', regex.test('testexample.com'));

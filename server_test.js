const html = `
      if(!/^[6-9]\\d{9}$/.test('9999999999')){ console.log('fails'); } else { console.log('works'); }
`;
console.log("HTML served by backend is:");
console.log(html);

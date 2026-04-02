#!/usr/bin/env node

/**
 * Script para gerar hash de senha usando bcryptjs
 * Uso: node scripts/generate-password-hash.js [senha]
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function generateHash(password) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Senha fornecida como argumento
    const password = args[0];
    const hash = generateHash(password);
    
    console.log('\n🔐 Hash de Senha Gerado:\n');
    console.log('Senha:', password);
    console.log('Hash:', hash);
    console.log('\n✅ Use este hash no SQL ou no código\n');
    
    process.exit(0);
  } else {
    // Solicitar senha interativamente
    console.log('\n🔐 Gerador de Hash de Senha\n');
    
    rl.question('Digite a senha: ', (password) => {
      if (!password || password.trim() === '') {
        console.log('❌ Senha não pode ser vazia');
        rl.close();
        process.exit(1);
      }
      
      const hash = generateHash(password);
      
      console.log('\n✅ Hash gerado com sucesso!\n');
      console.log('Senha:', password);
      console.log('Hash:', hash);
      console.log('\n📋 Copie o hash acima e use no SQL ou no código\n');
      
      rl.close();
    });
  }
}

main();

// ENDAP Ladder Engine Opcodes

class Opcodes {
  // Ler valor de Tag para a Pilha
  static const int LD = 0x01;
  static const int LDN = 0x02; // Load NOT

  // Operações Lógicas com a Pilha
  static const int AND = 0x03;
  static const int ANDN = 0x04; // And NOT
  static const int OR = 0x05;
  static const int ORN = 0x06; // Or NOT

  // Escrita de Saídas
  static const int ST = 0x10; // Store (Bobina Simples)
  static const int SET = 0x11; // Latch (Set)
  static const int RST = 0x12; // Unlatch (Reset)
  
  // Controle de Bloco Paralelo
  static const int OR_BLOCK_START = 0x20;
  static const int OR_BLOCK_NEXT = 0x21;
  static const int OR_BLOCK_END = 0x22;
}

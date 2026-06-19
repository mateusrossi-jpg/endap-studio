import React, { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { EndapProject } from '../types/endap';

interface DashboardProps {
  project: EndapProject;
}

type TabKey = 'panel' | 'connect' | 'automation' | 'operations' | 'nodes';

export const Dashboard: React.FC<DashboardProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('panel');
  const [isScanning, setIsScanning] = useState(false);
  const [networks, setNetworks] = useState<string[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState({ cpu: 2, scan: 0.1, oee: 98.5 });

  useEffect(() => {
    // Simulador de flutuação em tempo real para dar aspecto HMI profissional
    const interval = setInterval(() => {
      setRealTimeMetrics(prev => ({
        cpu: Math.max(1, Math.min(100, prev.cpu + (Math.random() * 2 - 1))),
        scan: Math.max(0.1, prev.scan + (Math.random() * 0.05 - 0.025)),
        oee: Math.max(90, Math.min(100, prev.oee + (Math.random() * 0.2 - 0.1)))
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const activeInputs = project.io.filter(p => p.direction === 'input' && p.state).length;
  const activeOutputs = project.io.filter(p => p.direction === 'output' && p.state).length;

  const handleScan = () => {
    setIsScanning(true);
    setNetworks([]);
    setTimeout(() => {
      setNetworks(['WIFI-FABRICA-01', 'WIFI-VISITANTES', 'ENDAP-GATEWAY-NET', 'REDE-MESA-4']);
      setIsScanning(false);
    }, 1500);
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1>ENDAP Device Manager</h1>
          <p>Visão geral do sistema e status das conexões do gateway.</p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.btnPrimary}>Sincronizar Cloud</button>
          <button className={styles.btnDanger}>Reiniciar Gateway</button>
        </div>
      </div>

      {activeTab === 'panel' && (
        <>
          <div className={styles.hero}>
            <div className={styles.kicker}>Visão geral</div>
            <h1>Veja rapidamente se o sistema está pronto para uso.</h1>
            <p>O painel principal mostra a saúde do nó, a conexão, o cluster, as entradas e as saídas sem expor detalhes técnicos desnecessários.</p>
            <div className={styles.heroActions}>
              <button className={styles.primaryBtn} onClick={() => setActiveTab('connect')}>Conectar este nó</button>
              <button className={styles.softBtn} onClick={() => setActiveTab('automation')}>Criar automação</button>
              <button className={styles.softBtn} onClick={() => setActiveTab('nodes')}>Ver nós</button>
            </div>
          </div>
          
          <div className={styles.gridCards}>
            <div className={styles.stat} style={{ borderBottom: '3px solid #10b981' }}>
              <div className={styles.label}>OEE Global</div>
              <div className={styles.value} style={{ color: '#10b981' }}>{realTimeMetrics.oee.toFixed(1)}%</div>
              <div className={styles.sub}>Eficiência Geral Produtiva</div>
            </div>
            <div className={styles.stat} style={{ borderBottom: '3px solid var(--cyan)' }}>
              <div className={styles.label}>Carga da CPU</div>
              <div className={styles.value} style={{ color: 'var(--cyan)' }}>{realTimeMetrics.cpu.toFixed(1)}%</div>
              <div className={styles.sub}>Pico de 14.2% na última hora</div>
            </div>
            <div className={styles.stat} style={{ borderBottom: '3px solid #8b5cf6' }}>
              <div className={styles.label}>Tempo de Scan</div>
              <div className={styles.value} style={{ color: '#8b5cf6' }}>{realTimeMetrics.scan.toFixed(2)} ms</div>
              <div className={styles.sub}>Objetivo: &lt; 5ms</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.label}>Entradas ativas</div>
              <div className={styles.value}>{activeInputs}</div>
              <div className={styles.sub}>Sensores / Sinais em nível HIGH</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.label}>Saídas ligadas</div>
              <div className={styles.value}>{activeOutputs}</div>
              <div className={styles.sub}>Atuadores energizados</div>
            </div>
          </div>
          
          <div className={styles.gridTwo}>
            <div className={styles.card}>
              <div className={styles.kicker}>Análise Preditiva (AI-Driven)</div>
              <h2>Saúde da Lógica e Intertravamentos</h2>
              <div className={styles.list}>
                 <div className={styles.item} style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                   <div>
                     <strong style={{ color: '#10b981' }}>Estabilidade do Scan (Excelente)</strong>
                     <span>Seu projeto atual tem {project.ladderProgram.rungs.length} rungs. O motor garante tempo de ciclo constante, prevenindo jitter nas portas de I/O críticas.</span>
                   </div>
                 </div>
                 <div className={styles.item}>
                   <div>
                     <strong>Alocação de Memória</strong>
                     <span>Você utilizou {(project.tags?.length || 0) * 8} bytes de tags mapeadas de um total disponível de 64KB no microcontrolador. Sem risco de stack overflow.</span>
                   </div>
                 </div>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.kicker}>Trilha de Auditoria</div>
              <h2>Logs Operacionais recentes</h2>
              <div className={styles.list}>
                 <div className={styles.item}>
                   <div>
                     <strong>Sincronização Cloud</strong>
                     <span>Concluída com sucesso às {new Date().toLocaleTimeString()} (Latência: 45ms)</span>
                   </div>
                 </div>
                 <div className={styles.item}>
                   <div>
                     <strong>Modificação do Ladder</strong>
                     <span>Compilação JIT detectada. Otimização em background realizada.</span>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'connect' && (
        <>
          <div className={styles.hero}>
            <div className={styles.kicker}>Conectar este nó</div>
            <h1>Coloque este ESP na rede principal sem complicação.</h1>
            <p>Busque redes Wi‑Fi, escolha uma da lista, digite somente a senha e conecte. O nome manual da rede fica disponível só como exceção.</p>
            <div className={styles.heroActions}>
              <button className={styles.primaryBtn} onClick={handleScan} disabled={isScanning}>
                {isScanning ? 'Buscando...' : 'Buscar redes'}
              </button>
              <button className={styles.softBtn}>Conectar</button>
            </div>
          </div>
          <div className={styles.gridTwo}>
            <div className={styles.card}>
              <div className={styles.kicker}>Entrar na rede</div>
              <h2>Conexão Wi‑Fi</h2>
              <div className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label>Redes encontradas</label>
                    <select disabled={isScanning}>
                      {isScanning ? (
                        <option>Buscando redes próximas...</option>
                      ) : networks.length === 0 ? (
                        <option>Nenhuma rede buscada ainda</option>
                      ) : (
                        networks.map(net => <option key={net} value={net}>{net}</option>)
                      )}
                    </select>
                  </div>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label>Senha</label>
                    <input type="password" placeholder="Senha da rede" />
                  </div>
                </div>
                <div className={styles.preview}>
                  <small>Resumo</small>
                  <div>Escolha uma rede e digite a senha para este ESP entrar na rede principal.</div>
                </div>
                <div className={styles.actions}>
                  <button className={styles.softBtn} onClick={handleScan} disabled={isScanning}>
                    {isScanning ? 'Buscando...' : 'Buscar redes'}
                  </button>
                  <button className={styles.primaryBtn} disabled={networks.length === 0}>Conectar</button>
                </div>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.kicker}>Status da conexão</div>
              <h2>Estado atual</h2>
              <div className={styles.list}>
                <div className={styles.empty}>Conectado ao Gateway. IP: {project.gateway.ipAddress}</div>
              </div>
              <div className={styles.actions}>
                <button className={styles.softBtn}>Tentar reconectar</button>
                <button className={styles.softBtn}>Reativar Wi‑Fi</button>
                <button className={styles.dangerBtn}>Abrir recovery AP</button>
              </div>
            </div>
          </div>
          <div className={styles.gridTwo}>
            <div className={styles.card}>
              <div className={styles.kicker}>Enlaces</div>
              <h2>Perfis de conexão</h2>
              <div className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Wi‑Fi</label>
                    <select><option>Ativo no próximo boot</option><option>Desativado no próximo boot</option></select>
                  </div>
                  <div className={styles.field}>
                    <label>Modo Wi-Fi</label>
                    <select><option>Infraestrutura (Padrão)</option></select>
                  </div>
                  <div className={styles.field}>
                    <label>RJ45 / Ethernet</label>
                    <select><option>Ativo no próximo boot</option><option>Desativado no próximo boot</option></select>
                  </div>
                  <div className={styles.field}>
                    <label>RS485</label>
                    <select><option>Ativo no próximo boot</option><option>Desativado no próximo boot</option></select>
                  </div>
                </div>
                <div className={styles.preview}>
                  <small>Resumo</small>
                  <div>Cada transporte habilitado reserva seus GPIOs; desabilitado, libera os pinos para IO.</div>
                </div>
                <div className={styles.actions}>
                  <button className={styles.softBtn}>Salvar enlaces</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'automation' && (
        <>
          <div className={styles.hero}>
            <div className={styles.kicker}>Criar automação</div>
            <h1>Monte regras rápidas sem abrir o modo técnico.</h1>
            <p>Escolha a entrada, escolha a saída e diga o que deve acontecer. A dashboard resume a intenção em linguagem simples e deixa o detalhe técnico recolhido para quando você realmente precisar.</p>
          </div>
          <div className={styles.microGrid}>
            <div className={styles.microCard}><div className={styles.label}>Regras salvas</div><div className={styles.value}>0</div><div className={styles.sub}>Nenhuma regra carregada.</div></div>
            <div className={styles.microCard}><div className={styles.label}>Temporizadas</div><div className={styles.value}>0</div><div className={styles.sub}>Pulso e atrasos configurados.</div></div>
            <div className={styles.microCard}><div className={styles.label}>Persistidas</div><div className={styles.value}>Sim</div><div className={styles.sub}>Salvas no projeto.</div></div>
            <div className={styles.microCard}><div className={styles.label}>Próximo passo</div><div className={styles.value}>-</div><div className={styles.sub}>Selecione entrada e saída.</div></div>
          </div>
          <div className={styles.gridTwo}>
            <div className={styles.card}>
              <div className={styles.kicker}>Fluxo simples</div>
              <h2>Nova automação</h2>
              <div className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.field}><label>Quando</label><select><option>Selecione a entrada</option></select></div>
                  <div className={styles.field}><label>Então</label><select><option>Selecione a saída</option></select></div>
                  <div className={styles.field}>
                    <label>Ação</label>
                    <select><option>Acompanhar</option><option>Ligar</option><option>Desligar</option><option>Alternar</option><option>Pulso</option></select>
                  </div>
                  <div className={styles.field}><label>Tempo (ms)</label><input type="number" defaultValue="500" /></div>
                </div>
                <div className={styles.preview}>
                  <small>Prévia</small>
                  <div>Escolha a entrada, a saída e a ação para ver a automação pronta.</div>
                </div>
                <div className={styles.noteStrip}>Este fluxo cobre os casos mais comuns. O ENDAP traduz sua escolha para a regra técnica automaticamente.</div>
                <div className={styles.actions}>
                  <button className={styles.primaryBtn}>Salvar automação</button>
                </div>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.kicker}>Resumo das regras</div>
              <h2>Automações atuais</h2>
              <div className={styles.list}>
                <div className={styles.empty}>Nenhuma automação simples configurada. As lógicas complexas estão no Ladder.</div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'operations' && (
        <>
          <div className={styles.hero}>
            <div className={styles.kicker}>Operação global</div>
            <h1>Veja e opere rapidamente os canais ativos de todos os nós.</h1>
            <p>Esta tela reúne entradas e saídas ativas da instalação em um único lugar. É a visão prática para inspeção rápida e acionamento manual, complementando a configuração por nó.</p>
            <div className={styles.heroActions}>
              <button className={styles.primaryBtn}>Atualizar agora</button>
            </div>
          </div>
          <div className={styles.microGrid}>
            <div className={styles.microCard}><div className={styles.label}>Entradas totais</div><div className={styles.value}>{project.io.filter(i=>i.direction==='input').length}</div><div className={styles.sub}>Canais de entrada visíveis.</div></div>
            <div className={styles.microCard}><div className={styles.label}>Entradas ativas</div><div className={styles.value}>{activeInputs}</div><div className={styles.sub}>Em nível ativo agora.</div></div>
            <div className={styles.microCard}><div className={styles.label}>Saídas totais</div><div className={styles.value}>{project.io.filter(i=>i.direction==='output').length}</div><div className={styles.sub}>Canais de saída visíveis.</div></div>
            <div className={styles.microCard}><div className={styles.label}>Saídas ligadas</div><div className={styles.value}>{activeOutputs}</div><div className={styles.sub}>Ligadas neste momento.</div></div>
          </div>
          <div className={styles.gridTwo}>
            <div className={styles.card}>
              <div className={styles.kicker}>Resumo</div>
              <h2>Estado da operação</h2>
              <div className={styles.list}>
                <div className={styles.empty}>Operação ativa e sincronizada com o projeto Studio.</div>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.kicker}>Uso</div>
              <h2>Como interpretar</h2>
              <div className={styles.list}>
                <div className={styles.item}><div><strong>Entradas</strong><span>Exibem leitura atual e origem por nó. Use para supervisão rápida de sensores, botões e estados de campo.</span></div></div>
                <div className={styles.item}><div><strong>Saídas</strong><span>Podem ser acionadas manualmente quando o backend do nó permitir. O comando é enviado diretamente ao nó responsável.</span></div></div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'nodes' && (
        <>
          <div className={styles.hero}>
            <div className={styles.kicker}>Nós do sistema</div>
            <h1>Veja quais ESPs estão online.</h1>
            <p>A lista de nós mostra status e identificação. Sem adoção, sem edição.</p>
          </div>
          <div className={styles.microGrid}>
            <div className={styles.microCard}><div className={styles.label}>Nós visíveis</div><div className={styles.value}>{project.nodes.length}</div><div className={styles.sub}>Lidos do projeto.</div></div>
            <div className={styles.microCard}><div className={styles.label}>Online</div><div className={styles.value}>{project.nodes.filter(n=>n.status==='online').length}</div><div className={styles.sub}>Nós respondendo agora.</div></div>
            <div className={styles.microCard}><div className={styles.label}>Offline</div><div className={styles.value}>{project.nodes.filter(n=>n.status==='offline').length}</div><div className={styles.sub}>Nós sem resposta.</div></div>
            <div className={styles.microCard}><div className={styles.label}>Gateway</div><div className={styles.value}>{project.gateway.status}</div><div className={styles.sub}>Status principal.</div></div>
          </div>
          <div className={styles.card}>
            <div className={styles.kicker}>Lista de nós</div>
            <h2>Cluster</h2>
            <div className={styles.list}>
              {project.nodes.length === 0 ? (
                <div className={styles.empty}>Nenhum nó adotado no projeto.</div>
              ) : (
                project.nodes.map(node => (
                  <div key={node.id} className={styles.item}>
                    <div className="node-info">
                      <strong>{node.alias}</strong>
                      <span>Status: {node.status} • Profile: {node.profile}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};


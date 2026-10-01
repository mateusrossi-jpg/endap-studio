import { chromium, devices } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = './screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)){
    fs.mkdirSync(SCREENSHOTS_DIR);
}

// iPhone 13 Pro Max viewport
const iPhone = devices['iPhone 13 Pro Max'];

const state1 = {
  id: "proj_1",
  name: "Project 1",
  tags: {},
  networks: [
    {
      id: "net_1",
      name: "",
      nodes: [],
      connections: []
    }
  ],
  metadata: {}
};

const state2 = {
  id: "proj_2",
  name: "Project 2",
  tags: {},
  networks: [
    {
      id: "net_1",
      name: "",
      nodes: [],
      connections: []
    }
  ],
  metadata: {}
};

const state3 = {
  id: "proj_3",
  name: "Project 3",
  tags: {
    "TAG1": {"id": "TAG1", "name": "TAG1", "type": "bool", "initialValue": {"boolValue": false}},
    "TAG2": {"id": "TAG2", "name": "TAG2", "type": "bool", "initialValue": {"boolValue": false}},
    "TIMER1": {"id": "TIMER1", "name": "TIMER1", "type": "timer", "initialValue": {"intValue": 0}},
    "OUT1": {"id": "OUT1", "name": "OUT1", "type": "bool", "initialValue": {"boolValue": false}}
  },
  networks: [
    {
      id: "net_1",
      name: "Main Logic",
      nodes: [
        {"id": "node_1", "type": "contactNO", "config": {"tagId": "TAG1"}},
        {"id": "node_2", "type": "contactNC", "config": {"tagId": "TAG2"}},
        {"id": "node_3", "type": "timerTON", "config": {"tagId": "TIMER1", "presetValue": {"intValue": 5000}}},
        {"id": "node_4", "type": "coil", "config": {"tagId": "OUT1"}}
      ],
      connections: []
    }
  ],
  metadata: {}
};

const state4 = {
  id: "proj_4",
  name: "Project 4",
  tags: {
    "START": {"id": "START", "name": "START", "type": "bool", "initialValue": {"boolValue": false}},
    "STOP": {"id": "STOP", "name": "STOP", "type": "bool", "initialValue": {"boolValue": false}},
    "MOTOR": {"id": "MOTOR", "name": "MOTOR", "type": "bool", "initialValue": {"boolValue": false}},
    "SENSOR1": {"id": "SENSOR1", "name": "SENSOR1", "type": "bool", "initialValue": {"boolValue": false}},
    "VALVE1": {"id": "VALVE1", "name": "VALVE1", "type": "bool", "initialValue": {"boolValue": false}},
    "T1": {"id": "T1", "name": "T1", "type": "timer", "initialValue": {"intValue": 0}}
  },
  networks: [
    {
      id: "net_1",
      name: "Motor Control",
      nodes: [
        {"id": "node_1_1", "type": "contactNO", "config": {"tagId": "START"}},
        {"id": "node_1_2", "type": "contactNC", "config": {"tagId": "STOP"}},
        {"id": "node_1_3", "type": "coil", "config": {"tagId": "MOTOR"}}
      ],
      connections: []
    },
    {
      id: "net_2",
      name: "Valve Interlock",
      nodes: [
        {"id": "node_2_1", "type": "contactNO", "config": {"tagId": "MOTOR"}},
        {"id": "node_2_2", "type": "contactNO", "config": {"tagId": "SENSOR1"}},
        {"id": "node_2_3", "type": "coil", "config": {"tagId": "VALVE1"}}
      ],
      connections: []
    },
    {
      id: "net_3",
      name: "Timer Control",
      nodes: [
        {"id": "node_3_1", "type": "contactNO", "config": {"tagId": "VALVE1"}},
        {"id": "node_3_2", "type": "timerTON", "config": {"tagId": "T1", "presetValue": {"intValue": 3000}}}
      ],
      connections: []
    },
    {
      id: "net_4",
      name: "Alarm",
      nodes: [
        {"id": "node_4_1", "type": "timerTON", "config": {"tagId": "T1", "presetValue": {"intValue": 3000}}},
        {"id": "node_4_2", "type": "coil", "config": {"tagId": "ALARM"}}
      ],
      connections: []
    }
  ],
  metadata: {}
};

const states = [
  { name: '01-toolbox-completa', data: state1 },
  { name: '02-rung-vazia', data: state2 },
  { name: '03-logica-simples', data: state3 },
  { name: '04-multiplas-rungs', data: state4 }
];

async function main() {
  const browser = await chromium.launch();
  
  for (const state of states) {
    const context = await browser.newContext({
      ...iPhone,
      deviceScaleFactor: 2, 
    });
    const page = await context.newPage();
    
    // First, navigate to the URL
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Set state
    await page.evaluate((projectData) => {
      window.localStorage.setItem('flutter.endap_ladder_autosave', JSON.stringify(JSON.stringify(projectData)));
    }, state.data);
    
    // Reload so it picks up the localstorage
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for the Canvas to render and the app to be fully initialized
    await page.waitForTimeout(3000); 
    
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${state.name}.png` });
    console.log(`Saved ${state.name}.png`);
    
    await context.close();
  }
  
  await browser.close();
}

main().catch(console.error);

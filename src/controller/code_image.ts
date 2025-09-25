import * as  puppeteer from 'puppeteer';
import { codeToHtml } from 'shiki'
import * as diff from 'diff-match-patch';
import { Mutex } from 'async-mutex';


type Page = {
  useTime: number;
  busy: boolean;
  page: puppeteer.Page;
}
export class Puppeteer {

  public static browser: puppeteer.Browser;
  public static pageList: Page[] = [];
  public static mutex: Mutex;
  public static async init() {
    this.browser = await puppeteer.launch();
    this.mutex = new Mutex();

  }
  static async getPage(): Promise<Page> {
    try {
      const release = await this.mutex.acquire();
      try {
        for (let i = 0; i < this.pageList.length; i++) {
          const page = this.pageList[i];
          if (!page.busy) {
            page.busy = true;
            page.useTime = Date.now();
            return page;
          }
        }
      } finally {
        release()
      }
      const page = await this.browser.newPage();
      const newPage = {
        useTime: Date.now(),
        busy: true,
        page,
      }
      const release2 = await this.mutex.acquire();
      try {
        this.pageList.push(newPage)
      } finally {
        release2()
      }
      return newPage;
    } catch (e) {
      console.error('get page error', e)
      throw e;
    }
  }
}


export async function code2Image(newCode: string, oldCode: string): Promise<string> {
  newCode = Buffer.from(newCode, 'base64').toString('utf8');
  oldCode = Buffer.from(oldCode, 'base64').toString('utf8');
  const dmp = new diff.diff_match_patch();
  let diffs = dmp.diff_main(oldCode, newCode);
  dmp.diff_cleanupSemantic(diffs);
  let diffDecorations = []
  let lineNum = 0
  let lastCharacter = 0
  for (let i = 0; i < diffs.length; i++) {
    let part = diffs[i];
    let type = part[0];
    let text = part[1]
    const beforeLineNum = lineNum
    const beforeLastCharacter = lastCharacter
    const lines = text.split('\n');
    lineNum += lines.length - 1
    lastCharacter = lines ? lines[lines.length - 1].length : text.length
    if (type === diff.DIFF_EQUAL) {
      continue;
    }
    if (type === diff.DIFF_INSERT) {
      diffDecorations.push({
        start: { line: beforeLineNum, character: beforeLastCharacter },
        end: { line: lineNum, character: beforeLineNum == lineNum ? beforeLastCharacter + lastCharacter : lastCharacter },
        properties: { class: 'highlighted-word' }
      })

    }

  }

  const codeHtml = await codeToHtml(newCode, {
    lang: 'javascript',
    theme: 'monokai',
    decorations: diffDecorations
  })

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head><title>Example</title></head>
      <style>
        pre {
            margin: 0;
            display: inline;
            margin-block: 0;
            height: 100%;
        }

        #codeHtml {
            display: inline-block;
            vertical-align: top;
            background-color: #272822
        }

        .highlighted-word {
            background-color: #236f65ff
        }
      </style>
      <body style="text-align: left; margin: 0;">
        <script src="https://cdn.jsdelivr.net/npm/dom-to-image@2.6.0/dist/dom-to-image.min.js"></script>
        <div id="codeHtml">
            ${codeHtml}
        </div>
      </body>
    </html>
  `;
  const page = await Puppeteer.getPage()
  await page.page.setContent(htmlContent)
  let r1 = await page.page.evaluate(`e = document.getElementById('codeHtml');domtoimage.toPng(e,{width: e.offsetWidth * 2,height: e.offsetHeight * 2,style: {transform: \`scale(2)\`,transformOrigin: "top left"}})`)
  page.busy = false
  return r1 as string


}




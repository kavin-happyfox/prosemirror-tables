import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-menu/style/menu.css';
import 'prosemirror-example-setup/style/style.css';
import 'prosemirror-gapcursor/style/gapcursor.css';
import '../style/tables.css';

import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { DOMParser, Schema } from 'prosemirror-model';
import { schema as baseSchema } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { exampleSetup, buildMenuItems } from 'prosemirror-example-setup';
import { MenuItem, Dropdown } from 'prosemirror-menu';

import {
  addColumnAfter,
  addColumnBefore,
  deleteColumn,
  addRowAfter,
  addRowBefore,
  deleteRow,
  mergeCells,
  splitCell,
  setCellAttr,
  toggleHeaderRow,
  toggleHeaderColumn,
  toggleHeaderCell,
  goToNextCell,
  deleteTable,
} from '../src';
import { tableEditing, columnResizing, tableNodes, fixTables } from '../src';

const tableNodeSpecs = tableNodes({
  tableGroup: 'block',
  cellContent: 'block+',
  cellAttributes: {
    background: {
      default: null,
      getFromDOM(dom) {
        return dom.style.backgroundColor || null;
      },
      setDOMAttr(value, attrs) {
        if (value)
          attrs.style = (attrs.style || '') + `background-color: ${value};`;
      },
    },
  },
});

const nodeSpecs = baseSchema.spec.nodes.append(tableNodeSpecs);

const updatedNodes = nodeSpecs.append({
  table_inline_cell: {
    ...tableNodeSpecs.table_cell,
    inline: true,
    content: 'inline+',
  },
});

const tableCellNode = updatedNodes.get('table_cell');
if (tableCellNode && tableCellNode.parseDOM) {
  tableCellNode.parseDOM = tableCellNode.parseDOM.map(({ tag, getAttrs }) => {
    return {
      tag,
      getAttrs: (dom: HTMLElement) => {
        if (!getAttrs) return null;

        const { firstChild } = dom;
        if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
          console.log(
            'Inside table_cell(parse for Block) - But its a text node, so returning false',
          );
          return false;
        } else {
          console.log(
            'Inside table_cell(parse for Block) - Its not a text node, so parsing it',
            dom,
          );
          const attrs = getAttrs(dom);
          return attrs;
        }
      },
    };
  });
}

const tableCellInlineNode = updatedNodes.get('table_inline_cell');
if (tableCellInlineNode && tableCellInlineNode.parseDOM) {
  tableCellInlineNode.parseDOM = tableCellInlineNode.parseDOM.map(
    ({ tag, getAttrs }) => {
      return {
        tag,
        getAttrs: (dom: HTMLElement) => {
          if (!getAttrs) return null;

          const { firstChild } = dom;
          if (firstChild && firstChild.nodeType !== Node.TEXT_NODE) {
            console.log(
              'Inside table_cell(parse for Inline) - But its not a text node, returning false',
            );
            return false;
          } else {
            console.log(
              'Inside table_cell(parse for Inline) - Its a text node, so parsing it',
              dom,
            );

            const attrs = getAttrs(dom);
            return attrs;
          }
        },
      };
    },
  );
}

const schema = new Schema({
  nodes: updatedNodes,
  marks: baseSchema.spec.marks,
});

const menu = buildMenuItems(schema).fullMenu;
function item(label: string, cmd: (state: EditorState) => boolean) {
  return new MenuItem({ label, select: cmd, run: cmd });
}
const tableMenu = [
  item('Insert column before', addColumnBefore),
  item('Insert column after', addColumnAfter),
  item('Delete column', deleteColumn),
  item('Insert row before', addRowBefore),
  item('Insert row after', addRowAfter),
  item('Delete row', deleteRow),
  item('Delete table', deleteTable),
  item('Merge cells', mergeCells),
  item('Split cell', splitCell),
  item('Toggle header column', toggleHeaderColumn),
  item('Toggle header row', toggleHeaderRow),
  item('Toggle header cells', toggleHeaderCell),
  item('Make cell green', setCellAttr('background', '#dfd')),
  item('Make cell not-green', setCellAttr('background', null)),
];
menu.splice(2, 0, [new Dropdown(tableMenu, { label: 'Table' })]);

const contentElement = document.querySelector('#content');
if (!contentElement) {
  throw new Error('Failed to find #content');
}
const doc = DOMParser.fromSchema(schema).parse(contentElement);

let state = EditorState.create({
  doc,
  plugins: [
    columnResizing(),
    tableEditing(),
    keymap({
      Tab: goToNextCell(1),
      'Shift-Tab': goToNextCell(-1),
    }),
  ].concat(
    exampleSetup({
      schema,
      menuContent: menu,
    }),
  ),
});
const fix = fixTables(state);
if (fix) state = state.apply(fix.setMeta('addToHistory', false));

(window as any).view = new EditorView(document.querySelector('#editor'), {
  state,
});

document.execCommand('enableObjectResizing', false, 'false');
document.execCommand('enableInlineTableEditing', false, 'false');

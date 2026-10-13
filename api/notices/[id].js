import { noticeDependencies } from '../notices.js';
import { createNoticeHandler } from '../../src/notice-api.mjs';
export default createNoticeHandler({ ...noticeDependencies, item: true });

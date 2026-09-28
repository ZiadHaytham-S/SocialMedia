import { IBlock } from "../../common/interfaces/friendship.interface";
import { BlockModel } from "../models/block.model";
import { DataBaseRepository } from "./base.repository";

export class BlockRepository extends DataBaseRepository<IBlock> {
  constructor() {
    super(BlockModel);
  }
}

import { IStory } from "../../common/interfaces";
import { StoryModel } from "../models/story.model";
import { DataBaseRepository } from "./base.repository";

export class StoryRepository extends DataBaseRepository<IStory> {
  constructor() {
    super(StoryModel);
  }
}

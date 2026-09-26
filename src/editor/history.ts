export class History<T> {
 private undoStack:T[]=[];private redoStack:T[]=[];
 record(before:T){this.undoStack.push(structuredClone(before));if(this.undoStack.length>60)this.undoStack.shift();this.redoStack=[];}
 undo(current:T){const prior=this.undoStack.pop();if(!prior)return current;this.redoStack.push(structuredClone(current));return prior;}
 redo(current:T){const next=this.redoStack.pop();if(!next)return current;this.undoStack.push(structuredClone(current));return next;}
 get canUndo(){return !!this.undoStack.length;}get canRedo(){return !!this.redoStack.length;}
}

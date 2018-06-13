var fs = require("fs");
var p = require("path");
var g = require("../gitlet");
var testUtil = require("./test-util");

describe("diff", function() {
  beforeEach(testUtil.initTestDataDir);
  beforeEach(testUtil.pinDate);
  afterEach(testUtil.unpinDate);

  it("should throw if not in repo", function() {
    expect(function() { g.diff(); })
      .toThrow("not a Gitlet repository");
  });

  it("should throw if in bare repo", function() {
    g.init({ bare: true });
    expect(function() { g.diff(); })
      .toThrow("this operation must be run in a work tree");
  });

  it("should throw unknown revision if ref1 not in objects", function() {
    g.init();
    expect(function() { g.diff("blah1") })
      .toThrow("ambiguous argument blah1: unknown revision");
  });

  it("should throw unknown revision if ref2 not in objects", function() {
    g.init();
    expect(function() { g.diff("blah2") })
      .toThrow("ambiguous argument blah2: unknown revision");
  });

  it("should include several files with changes", function() {
    testUtil.createStandardFileStructure();
    g.init();
    g.add(p.normalize("1a/filea"));
    g.add(p.normalize("1b/fileb"));
    g.add(p.normalize("1b/2b/filec"));
    g.commit({ m: "first" });
    fs.writeFileSync("1a/filea", "somethingelsea");
    fs.writeFileSync("1b/fileb", "somethingelseb");
    fs.writeFileSync("1b/2b/filec", "somethingelsec");
    expect(g.diff())
      .toEqual("M " + p.normalize("1a/filea") + "\nM " + p.normalize("1b/fileb") + "\nM " + p.normalize("1b/2b/filec\n"));
  });

  describe("no refs passed (index and WC)", function() {
    it("should show nothing for repo w no commits", function() {
      g.init();
      expect(g.diff()).toEqual("\n");
    });

    it("should not include unstaged files", function() {
      // this is because the file is never mentioned by the index,
      // which is to say: it doesn't compare absence against the WC hash.

      testUtil.createStandardFileStructure();
      g.init();
      expect(g.diff()).toEqual("\n");
    });

    it("should not include new file that is staged", function() {
      // this is because the file is in the index, but the version
      // in the WC is the same

      testUtil.createStandardFileStructure();
      g.init();
      g.add(p.normalize("1a/filea"));
      expect(testUtil.index()[0].path).toEqual(p.normalize("1a/filea"));
      expect(g.diff()).toEqual("\n");
    });

    it("should not include committed file w no changes", function() {
      testUtil.createStandardFileStructure();
      g.init();
      g.add(p.normalize("1a/filea"));
      g.commit({ m: "first" });
      expect(g.diff()).toEqual("\n");
    });

    it("should include committed file w unstaged changes", function() {
      testUtil.createStandardFileStructure();
      g.init();
      g.add(p.normalize("1a/filea"));
      g.commit({ m: "first" });
      fs.writeFileSync("1a/filea", "somethingelse");
      expect(g.diff())
        .toEqual("M " + p.normalize("1a/filea") + "\n");
    });

    it("should not include committed file w staged changes", function() {
      testUtil.createStandardFileStructure();
      g.init();
      g.add(p.normalize("1a/filea"));
      g.commit({ m: "first" });
      fs.writeFileSync("1a/filea", "somethingelse");
      g.add(p.normalize("1a/filea"));
      expect(g.diff()).toEqual("\n");
    });

    it("should say file that was created, staged, deleted was deleted", function() {
      testUtil.createStandardFileStructure();
      g.init();
      g.add(p.normalize("1a/filea"));
      fs.unlinkSync("1a/filea");
      expect(g.diff())
        .toEqual("D " + p.normalize("1a/filea") + "\n");
    });

    it("should not include file that was created, deleted but never staged", function() {
      testUtil.createStandardFileStructure();
      g.init();
      fs.unlinkSync("1a/filea");
      expect(g.diff()).toEqual("\n");
    });

    it("should say committed file that has now been deleted has been deleted", function() {
      testUtil.createStandardFileStructure();
      g.init();
      g.add(p.normalize("1a/filea"));
      g.commit({ m: "first" });
      fs.unlinkSync("1a/filea");
      expect(g.diff()).toEqual("D " + p.normalize("1a/filea") + "\n");
    });
  });

  describe("one ref passed (someref and WC)", function() {
    describe("HEAD passed (compared with WC)", function() {
      it("should blow up for HEAD if no commits", function() {
        g.init();
        expect(function() { g.diff("HEAD") })
          .toThrow("ambiguous argument HEAD: unknown revision");
      });

      it("should not include unstaged files", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        expect(g.diff("HEAD")).toEqual("\n");
      });

      it("should include new file that is staged", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.add(p.normalize("1b/fileb"));
        expect(g.diff("HEAD")).toEqual("A " + p.normalize("1b/fileb") + "\n");
      });

      it("should not include committed file w no changes", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        expect(g.diff("HEAD")).toEqual("\n");
      });

      it("should include committed file w unstaged changes", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        fs.writeFileSync("1a/filea", "somethingelse");
        expect(g.diff("HEAD")).toEqual("M " + p.normalize("1a/filea") + "\n");
      });

      it("should include committed file w staged changes", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        fs.writeFileSync("1a/filea", "somethingelse");
        g.add(p.normalize("1a/filea"));
        expect(g.diff("HEAD")).toEqual("M " + p.normalize("1a/filea") + "\n");
      });

      it("should not include file that was created, staged, deleted", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.add(p.normalize("1b/fileb"));
        fs.unlinkSync("1b/fileb");
        expect(g.diff("HEAD")).toEqual("\n");
      });

      it("should not include file that was created, deleted but never staged", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        fs.unlinkSync("1b/fileb");
        expect(g.diff("HEAD")).toEqual("\n");
      });

      it("should say committed file that has now been deleted has been deleted", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        fs.unlinkSync("1a/filea");
        expect(g.diff("HEAD")).toEqual("D " + p.normalize("1a/filea") + "\n");
      });
    });

    describe("non-head commits passed (compared with WC)", function() {
      it("should include committed file modified in WC if HEAD hash passed", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        fs.writeFileSync("1a/filea", "somethingelse");
        expect(g.diff("17a11ad4"))
          .toEqual("M " + p.normalize("1a/filea") + "\n");
      });

      it("should incl committed file modified in WC if branch from head passed", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("other");
        fs.writeFileSync("1a/filea", "somethingelse");
        expect(g.diff("other")).toEqual("M " + p.normalize("1a/filea") + "\n");
      });

      it("should blow up if non existent ref passed", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        expect(function() { g.diff("blah") })
          .toThrow("ambiguous argument blah: unknown revision");
      });
    });
  });

  describe("two refs passed", function() {
    describe("basic changes", function() {
      it("should blow up with two refs if no commits", function() {
        g.init();
        expect(function() { g.diff("a", "b") })
          .toThrow("ambiguous argument a: unknown revision");
      });

      it("should blow up for HEAD and other ref if no commits", function() {
        g.init();
        expect(function() { g.diff("HEAD", "b") })
          .toThrow("ambiguous argument HEAD: unknown revision");
      });

      it("should blow up if either ref does not exist", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        expect(function() { g.diff("blah1", "blah2") })
          .toThrow("ambiguous argument blah1: unknown revision");

        expect(function() { g.diff("HEAD", "blah2") })
          .toThrow("ambiguous argument blah2: unknown revision");
      });

      it("should not include unstaged files", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("a");
        g.branch("b");
        expect(g.diff("a", "b")).toEqual("\n");
      });

      it("should not include committed file w no changes", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("a");
        g.branch("b");
        expect(g.diff("a", "b")).toEqual("\n");
      });

      it("should include added file", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("a");
        g.add(p.normalize("1b/fileb"));
        g.commit({ m: "second" });
        g.branch("b");
        expect(g.diff("a", "b")).toEqual("A " + p.normalize("1b/fileb") + "\n");
      });

      it("should include changed file", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("a");
        fs.writeFileSync("1a/filea", "somethingelse");
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "second" });
        g.branch("b");
        expect(g.diff("a", "b")).toEqual("M " + p.normalize("1a/filea") + "\n");
      });

      it("should not include staged changes", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("a");
        g.branch("b");
        g.add(p.normalize("1b/fileb"));
        expect(g.diff("a", "b")).toEqual("\n");
      });
    });

    describe("reversing order of ref args", function() {
      it("should see deletion as addition and vice versa", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("a");
        g.add(p.normalize("1b/fileb"));
        g.commit({ m: "second" });
        g.branch("b");

        expect(g.diff("a", "b")).toEqual("A " + p.normalize("1b/fileb") + "\n");
        expect(g.diff("b", "a")).toEqual("D " + p.normalize("1b/fileb") + "\n");
      });

      it("should see modification in both directions", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("a");
        fs.writeFileSync("1a/filea", "somethingelse");
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "second" });
        g.branch("b");

        expect(g.diff("a", "b")).toEqual("M " + p.normalize("1a/filea") + "\n");
        expect(g.diff("b", "a")).toEqual("M " + p.normalize("1a/filea") + "\n");
      });
    });

    describe("diffing commits with intervening commits where a lot happened", function() {
      it("should see additions", function() {
        testUtil.createStandardFileStructure();
        g.init();

        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("a");

        g.add(p.normalize("1b/fileb"));
        g.commit({ m: "second" });

        g.add(p.normalize("1b/2b/filec"));
        g.commit({ m: "third" });

        g.add(p.normalize("1b/2b/3b/4b/filed"));
        g.commit({ m: "fourth" });
        g.branch("b");

        expect(g.diff("a", "b"))
          .toEqual("A " + p.normalize("1b/fileb") + "\nA " + p.normalize("1b/2b/filec") + "\nA " + p.normalize("1b/2b/3b/4b/filed") + "\n");
      });

      it("should see deletions", function() {
        testUtil.createStandardFileStructure();
        g.init();

        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("a");

        g.add(p.normalize("1b/fileb"));
        g.commit({ m: "second" });

        g.add(p.normalize("1b/2b/filec"));
        g.commit({ m: "third" });

        g.add(p.normalize("1b/2b/3b/4b/filed"));
        g.commit({ m: "fourth" });
        g.branch("b");

        expect(g.diff("b", "a"))
          .toEqual("D " + p.normalize("1b/fileb") + "\nD " + p.normalize("1b/2b/filec") + "\nD " + p.normalize("1b/2b/3b/4b/filed") + "\n");
      });

      it("should see modifications", function() {
        testUtil.createStandardFileStructure();
        g.init();

        g.add(p.normalize("1a/filea"));
        g.add(p.normalize("1b/fileb"));
        g.add(p.normalize("1b/2b/filec"));
        g.commit({ m: "first" });
        g.branch("a");

        fs.writeFileSync("1a/filea", "somethingelse");
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "second" });

        fs.writeFileSync("1b/fileb", "somethingelse");
        g.add(p.normalize("1b/fileb"));
        g.commit({ m: "third" });

        fs.writeFileSync("1b/2b/filec", "somethingelse");
        g.add(p.normalize("1b/2b/filec"));
        g.commit({ m: "fourth" });
        g.branch("b");

        expect(g.diff("a", "b"))
          .toEqual("M " + p.normalize("1a/filea") + "\nM " + p.normalize("1b/fileb") + "\nM " + p.normalize("1b/2b/filec") + "\n");
      });
    });

    describe("diffs in which several different types of thing happened", function() {
      it("should record additions and modifications", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("a");

        g.add(p.normalize("1b/fileb"));
        fs.writeFileSync("1a/filea", "somethingelse");
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "second" });
        g.branch("b");

        expect(g.diff("a", "b")).toEqual("M " + p.normalize("1a/filea") + "\nA " + p.normalize("1b/fileb") + "\n");
      });

      it("should record deletions and modifications", function() {
        testUtil.createStandardFileStructure();
        g.init();
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "first" });
        g.branch("a");

        g.add(p.normalize("1b/fileb"));
        fs.writeFileSync("1a/filea", "somethingelse");
        g.add(p.normalize("1a/filea"));
        g.commit({ m: "second" });
        g.branch("b");

        expect(g.diff("b", "a"))
          .toEqual("D " + p.normalize("1b/fileb") + "\nM " + p.normalize("1a/filea") + "\n");
      });
    });
  });
});

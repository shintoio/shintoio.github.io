---
layout: post
title:  "Introducing Amaterasu: Continuously Deployed Big Data Pipelines"
date:   2016-09-22 15:00:06 +1000
categories: Amaterasu BigData DevOps
---

A couple of weeks ago we presented Amaterasu at the Hadoop Summit in Melbourne.  It was a great opportunity for us to share with the community what we have been working on for the last few months.   More importantly, we hope that our efforts will help the Big Data community to move towards, and adopt modern development methodologies, which are now long overdue in the Big Data world.

## Why do anything?

Amaterasu was created to deal with some of the critical pains in deploying Big Data pipelines.

Over the last few years, we’ve experienced the growth and maturity of the industry, especially the way applications are continuously deployed to production environments.  The DevOps movement has changed the industry fundamentally, transforming both the mechanics of the development process, as well as the way we collaborate between development and operation teams.  This has broken down silos by creating autonomous teams who can now cater to the system’s needs at every stage of the lifecycle.

However, as software developers, when we tried to implement the same techniques and release culture in Big Data environments, we consistently encountered difficulties both technical and cultural.

The first challenge was the introduction of a new silo to our autonomous team; we call them the Data Crowd.  In any data centric project, data professionals such as BI Developers, Analysts and Data Scientists are an integral part of the products lifecycle. In fact, the Data Crowd, dominated the analytics space for many years. They had their own tools and practices, which focussed on exploratory workloads and usually preferred visual tools over code, which makes it hard to use tools such as source control systems to manage the development process.

The problem started to arise with the introduction of new Big Data technologies such as Hadoop and Spark, which raised the need for highly skilled software developers and complex operations to be integrated into those data centric projects, creating a clash between those two approaches. And while us software developers are generally a very inclusive bunch, it was clear that as the Big Data working environment became ‘crowded’, that it required new tools and practices to help create a common language between developers, operations and data professionals. 

If we take a  closer look at the way those three roles currently integrate today it will look like this:

![DataOps]({{ site.url }}/images/DataOps.png)

As you can see from the diagram above, integrating the three worlds is very demanding, and in some cases, might even destroy the entire universe! And whilst this might be accepted in traditional enterprise environments, if you are actually trying to deliver something, destroying the universe will just not do.

In the middle of the above diagram, there is a nirvana-like state of collaboration between all involved professionals (or at least so the Legend goes). We fondly call this DataOps, which is the logical name to call something just before someone publishes a landmark blog post titled the “rise of DataOps” (Well, that is not entirely our invention, the term already started to pop around the blogosphere in the last year, but we do expect such a blog post to be published very soon). The problem with reaching this illusive higher state of data applications is that it can only be achieved by one of the two following methods: drinking the blood of a unicorn, or building appropriate tools. Since unicorns only exist in silicon valley, we decided to build us some tools.

To address this and achieve this higher state of craftsmanship, we began to look at how DevOps tools such as Chef, Puppet, Ansible etc. improved the collaboration between developers and operations.  The key point we found, was having a simple DSL that can be easily understood by all involved parties (in the area where they need to integrate), that enabled them to collaborate in the delivery process.  In DevOps, this collaboration is mostly around the provisioning of infrastructure. 

Looking back at the Big Data world, we we wanted to apply the same solution to a different problem: the creation of Big Data pipelines by cross-functional teams using multiple frameworks, tools and programming languages. 

To build such a tool we had to deal with some of the operational complexities of the Big Data landscape:

 - Eclectic collection of tools and languages, anything from scientific tools and libraries to complex distributed resource management frameworks.
 - Multiple distributed systems, which need to be configured and managed in multiple environments.
 - Data as an integration point, that might be semi structured or unstructured, which adds extra fun.

We also had to tackle the gaps in the tools which exist in the big data ecosystem, specifically we were missing tools for:

 - Packaging and deploying complex pipelines. 
 - Testing the integration points between different components in our pipelines.
 - Configuration management tools that can be easily integrated with our environments.
 - Simple integration with CI tools such as Jenkins, etc.
 - And above all, a tool that can be adopted by software developers, data scientists and ops people alike. 

So as good citizens of the Big Data world, we decided to make things better, or at least die trying.

## Amaterasu FTW

Amaterasu is the name that we gave our open-source framework that we built to deal with those exact same difficulties (the credit for the name goes to David Ostrovsky who came up with it while ironing a shirt in his underwear in a hotel room in vegas, but that story deserves a blog post of it’s own). When we started thinking about our most urgent needs, it became clear we needed the following capabilities:

 - A way for CI tools to package pipelines and run tests.
 - A repository to store those packaged apps.
 - A repository to store the configuration of our pipelines and possibly other parts of the environment, such as the spark cluster, and other tools involved in the process.
 - Ways to monitor our pipelines.
 - We also wanted a simple DSL that will allow all involved parties to easily integrate their work, and use the same tools they are used to work with. 

Amaterasu was built with simplicity and robustness in mind. As we looked at the task at hand, it was clear that we couldn’t only package Big Data pipelines, we also needed to orchestrate the execution of several frameworks across potentially multiple clusters, so we built a runtime that could do just that, in a robust and distributed manner. After looking carefully at our options it was clear that the simplest, and probably most powerful way to go with was by building our runtime as an Apache Mesos framework. Apache Mesos gives us a distributed runtime for Amaterasu, great APIs for building a distributed application, an environment that can run most (if not all) of the distributed frameworks and systems, such as Hadoop, Spark, Kafka, Cassandra etc. and also the APIs to provision those as part of the Amaterasu deployment process if we choose to.

The best way to explain what Amaterasu is and does it to take a look at what an Amaterasu job is, so without further ado, let us build one.

## Building an Amaterasu job

The basic unit which defines an Amaterasu job is called a repo. We called it a repo, because physically that is what it is, a Git repository. Git repositories as we all know, are mapped to file-system folders, and we use a convention for the structure of Amaterasu repos. For example let’s take a look at the following repo:

{% highlight bash %}

   Amaterasu
   ├── maki.yml
   ├── src
   |   ├── file.scala
   |   ├── file2.scala
   |   └── error.scala
   ├── env
   |   ├── production.json
   |   └── dev.json
   └── deps
       └── jars.yml

{% endhighlight %}

The above repo has four elements that are a part of the Amaterasu convention:

 - The `maki.yml` file, which contains the definition of the workflow of the pipeline.
 - The `src` directory, which contains the different actions, this will be your actual Spark (and in future versions additional frameworks) code.
 - The `env` directory, which contains configurations for different environments.
 - The `deps` folder, which contains a YAML file describing all the jar dependencies your job has. In the next version we are going to introduce additional files to support pip and CRAN dependencies.

Let’s take a closer look at our maki.yml, which defines our pipeline. As you can see from the code snippet below, we define in YAML the job name, and the flow, which is a sequential workflow, containing three actions. Two of those actions will be executed sequentially (`start` and `step2`) and the third one is an error handling action that will be only executed if `step2` will fail. It’s also worthwhile to note that if an action does fail, Amaterasu will retry to execute it three times (this number as well as which errors should be retried will be configurable as of next version)

{% highlight yaml %}

---
job-name: amaterasu-test
flow:
    - name: start
      type: spark-scala
      file: file.scala
    - name: step2
      type: spark-scala
      file: file2.scala
      error:        
        name: error
        type: spark-scala
        file: error.scala        
...

{% endhighlight %}

Whilst Amaterasu has a built-in resilient workflow engine, we don’t see it as a workflow tool per se. In fact there are many robust workflow tools in this space we really like, for example, Apache Airflow, and it is very much possible we will have those supported in future versions. The reason for having our own, simplistic workflow engine is that big data applications are rarely deployed independently of other Big Data applications, and in order to deploy and test them we need a simple way to chain them together. This understanding also influences the way designed our actions DSL, which is what we will look at next. 

In our example we have three actions. Actions are plainly your standard Spark programs (for now, we are planning on supporting other frameworks eventually) with some additions. Currently actions are written in Scala as it is the only language supported for this preview, however work on Python and R is in advanced stages and will be released in version 0.2.0. Our first action is a very naive spark application, creating an RDD from a sequence of integers. One thing to notice here is that we are not creating the SparkContext in the code, but rather accessing it via the `AmaContext` object. It’s important to note two things:

 - Amaterasu will create sc for you, this is important to keep in mind because Amaterasu will expect you to configure the master per environment as we will see soon.
 - You don’t have to access sc from the AmaContext object, this is done to provide you static typing if you are using an IDE, if you are using vim for example, you can just access sc (in this case, you also don’t need to use `import io.shinto.amaterasu.runtime._`).


{% highlight scala %}

io.shinto.amaterasu.runtime._

val data = 1 to 1000 

val rdd = AmaContext.sc.parallelize(data)

val odd = rdd.filter(n => n%2 != 0).toDF("number")

{% endhighlight %}

The `AmaContext` does more than just giving access to `sc` (and also `sqlContext`, and soon enough to `SparkSession`). `AmaContext` main use is to provide the “glue” between the different actions. To thoroughly understand its role, we will have to take a look at the next action to be executed, `step2`:

{% highlight scala %}

io.shinto.amaterasu.runtime._

val oddRdd = AmaContext.getRDD[Int]("start", "rdd").filter(x=>x%2 == 0)
oddRdd.saveAsTextFile(s"${env.outputRootPath}/test/ordd_rdd")

val highNoDf = AmaContext.getDataFrame("start", "odd").where("number > 100")
highNoDf.write.mode(SaveMode.Overwrite).json(s"${env.outputRootPath}/dtatframe_res")

{% endhighlight %}

In the above code you can see that AmaContext can be used to access RDDs and DataFrames from previously executed actions. 

It’s important to note that in the current version we simply persist every RDD/DataFrame that is being created in any action. This is very wasteful, not only because of all the IO we perform but because we are forcing the Spark DAG to execute before it can perform optimizations in some scenarios. We are working hard to improve this in our future versions:

 - In our next version we will statically analyze the actions before executing the whole pipeline, and persist only data-structures that are being used directly downstream.
 - The need to persist the data structures that are being used exists because Amaterasu is distributed by nature and different actions might be executed on different nodes, however SparkContexts are created on an executor level, which means we are reusing the same SparkContext for all actions running on the same node, if you are accessing an RDD or a DataFrame that was created with the same SparkContext, there is absolutely no need to go through persistence. We are still thinking how to efficiently detect cases when this is the case, and minimize persistence.
 - We will also give users more control over this behaviour, they will be able to turn it off and actively choose to register RDDs/DataFrames.
 - We are looking to integrate better with in-memory technologies such as Alluxio, Apache Ignite and Apache Arrow

The astute readers noticed that we are using some more Amaterasu magic in the last line of `step2`. We are of course talking about the use of the `env` object for the output path, which conveniently leads us to our next topic: Environments!

## Configuring an Amaterasu job

Amaterasu jobs are configured per environment. This concept which already exists in version 0.1.0 is going to expand vastly in future versions, effectively as of version 0.2.0 which is already in the works. 

In the current setup, each environment is configured by a single json file, located in the `env` directory. For example, our current job has two environments configured: dev and production. Let’s take a look at the dev configuration:

{% highlight json %}

{
  "name":"dev",
  "master":"local[*]",
  "inputRootPath":"file:///amaterasu/input",
  "outputRootPath":"file:///amaterasu/output",
  "workingDir":"file:///tmp/amaterasu/work_dir",
  "configuration":{
    "spark.cassandra.connection.host":"127.0.0.1",
    "sourceTable":"documents",
    "err-msg":"To make error is human. To propagate error to all server in automatic way is #devops.\n                                   -DevOps Borat"
  }
}

{% endhighlight %}

As you can see, our dev version runs Spark in local mode. This allows us to configure Spark to run in different environments. In production or UAT we would probably use a Mesos master for Spark. Using local mode for dev is not a requirement, however, running Spark on Mesos requires quite a lot of resources, and several nodes which complicates things when you are trying to run on a dev machine. We also use local file system for the jobs input, output and working directory.

The input and output directories, are a common configuration that we encourage Amaterasu developers to use. We found them useful for running on small dataset in test and dev environments and have the full dataset when running in production as you can see in our production.json below:

{% highlight json %}

{
  "name":"production",
  "master":"mesos://mesosmaster:5050",
  "inputRootPath":"hdfs://node1:9000/user/amaterasu/input",
  "outputRootPath":"hdfs://node1:9000/user/amaterasu/output",
  "workingDir":"hdfs://node1:9000/user/amaterasu/work_dir",
  "configuration":{
    "spark.cassandra.connection.host":"cassie-prod",
    "sourceTable":"documents",
    "err-msg":"To make error is human. To propagate error to all server in automatic way is #devops.\n                                   -DevOps Borat"
  }
}

{% endhighlight %}

This is a simple way to test your pipelines, but we feel we can do a lot better, and we are planning on adding full-blown test capabilities in future versions.

The working directory is where we persist the data between actions. It is important to note that while we can use local file directories for this configuration, it will only work as long as we are running on a single node.

For all three directories, we currently support HDFS, S3 and local files, and we are currently testing Alluxio and Azure Blob storage.  

Last but not least, we have configuration, which is a simple key/value definition you can use to store whichever configuration value you need. As an example, we used it to store Cassandra connection, and a message we will use later in our error-handling task, but feel free to go crazy here.
The working directory is where we persist the data between actions. It is important to note that while we can use local file directories for this configuration, it will only work as long as we are running on a single node.

## Executing an Amaterasu job

Before you can execute your job you need to commit it into git and push it to a repository that is available to the cluster. If you don’t have one handy, you run the [sample][amaterasu-job-sample] in our github sample repo.

The code we just covered will be what is executed in most scenarios, so if we ignore for a moment all the fancy error handling we have in place we can execute our job and see how it is executed.

First, you’ll need a Mesos cluster. Luckily for you, we have a vagrant demo machine you can clone from our [github repo][amaterasu-demo-vagrant] and just run `vagrant up` to get a single node Mesos cluster. Once you do that, you can ssh into your mesos cluster (using `vagrant ssh` if you are using our demo machine). Next you need to download and extract the Amaterasu preview version by running:

{% highlight bash %}

wget https://s3-ap-southeast-2.amazonaws.com/amaterasu/amaterasu.tgz
tar zxvf  amaterasu.tgz

{% endhighlight %}	

Congratulations! You have just installed our preview version. Now we can run your Amaterasu job. The basic command we will execute is the start command which surprisingly starts an Amaterasu job:

{% highlight bash %}

cd ama
./ama-start.sh --repo="https://github.com/shintoio/amaterasu-job-sample" --env="dev" --report="code" --branch="master"

{% endhighlight %}

Let’s review the arguments passed to the ama-start command:

 - `--repo` points to the Amaterasu repo to be executed. We are using the job sample in GitHub but you should really point to whatever repo you want to execute. 
 - `--env` defines the environment you are executing for. In this case we will run in the dev environment using our dev.json as the source for configuration.
 - `--report` controls the output ama-start omits to the screen. Amaterasu is designed to be executed by different tools. This can be scheduling mechanisms such as cron or Chronos, or CI services such as Jenkins. In those cases, it makes no sense to print anything to the screen and the default for the `--report` argument is none. However, if you are running ama-start from the command line, it might be helpful to have have some sort of indication as to what is happening. In addition to the value none, the report argument can be set to execution, which gives indication about the state of actions or code that gives indication for each line of code being executed.
 - `--branch` allows users to specify the git branch to execute, we use it in our development workflow to execute feature branches, but it can really be used to fit your own workflow.

After you execute the job you should see the report printed out as shown in the below screenshot:

![An Amaterasu jobs output]({{ site.url }}/images/amaterasu.jpg)

## Some More Advanced Stuff

We’ve almost covered all the features available in this preview version, except for two: Error handling and working with external dependencies so first let’s add our error handling action, which will also have an external dependency: 

{% highlight scala %}

import com.flyberrycapital.slack.SlackClient

val s = new SlackClient(<API_TOKEN>)
s.chat.postMessage("#demos", env.configuration("err-msg"))

{% endhighlight %}

**Note:** To run this example you’ll need to create a slack app following these instructions [https://api.slack.com/slack-apps][slack-app] and generate an application token [https://api.slack.com/docs/oauth-test-tokens][slack-tokens]. You will also need to create a `#demos` channel for your team (or edit the code to send the message to an existing channel).

The first thing to note about this acation is that we are using `SlackClient` which is a third party library to send a message to Slack. In order for `SlackClient` to be in our actions classpath, we need to configure Amaterasu to fetch it from maven. This is done in the `deps/jars.yml` file:

{% highlight yaml %}

---
Repos:
    - id: maven-central
      type: default
      url: http://central.maven.org/maven2/
artifacts:  
    - groupId: com.flyberrycapital
      artifactId: scala-slack_2.10
      version: 0.3.0
...

{% endhighlight %}

This configuration allows us to both pull jars from artifact repositories, which can be public ones like maven central for third party components, or your own private one to pull down your own components and Spark applications. 

If you have worked with Spark before, you probably know, it is not enough to have dependencies available for driver program, but you need the cluster manager to make those dependencies available for all the executors in the cluster (this is done usually via the `--jars` argument). Using jars.ymal does exactly that so you can use those dependencies safely within your spark applications.

If we will run our job now, it will most likely execute exactly as before, because there shouldn’t be anything causing an error. Luckily for us, we are experts in failing spark jobs. The simplest way to fail step two is to add the following line at the beginning of `file2.scala`:

{% highlight scala %}

1/0

{% endhighlight %}

And now, we can commit our code, push it to our repo and run our job again. This time your execution report should look more like this:

![An Amaterasu jobs error-handling output]({{ site.url }}/images/amaterasu-error.jpg)

In addition, you should also receive a message to your slack channel reminding you the wise words of DevOps Borat:

![An Amaterasu jobs error-handling output]({{ site.url }}/images/slack.jpg)

## Version 0.2.0 and Beyond

As we have mentioned throughout this post, we have heaps of plans for the near and not so distant future. Version 0.2.0 is in motion and will add PySpark and SparkR support. In addition we are working on performance, stability and some slick tools. But our efforts are not going to stop there. We already have a big backlog and we wanted to share some of our thinking going forward:

 - **Integration with CI tools -** For this we see Jenkins as a natural choice for our first integration, mainly because it is available as a Mesos framework.
 - **Test workflows -** Running your full workflow on a sample dataset is better than having no tests at all, but that’s hardly the test capabilities we have in mind. We would like to have workflows that allow you to mock datasets, tests specific parts and scenarios in your pipeline and assert that the result is what you have anticipated.
 - **Extended configuration model -** We found our current environments model quite helpful, but as we started using it more, we realised we can do better, so we will work on improving that. In addition, as we plan for next version to be production ready, we  intend  to give you more control over your Spark configuration. Ideally we would like you to BYO Spark configuration so you can just put your spark-defaults.conf, etc. in the environment.
 - **Becoming a DC/OS universe package** - This is a natural way for us to make Amaterasu more accessible.
 - **Other Frameworks and Languages and extensible Actions model -** Spark is important, arguably it is the most important Big Data framework currently in use, and in addition to supporting it’s Python and R bindings we also planning on supporting SQL. Since there are some really powerful SQL engines out there like Apache Hive (which has a cool new execution engine called LLAP), and Apache Drill, we are looking at integrating with those as well. We also see value in integrating with the linux shell, which will allow users to automate tools such as sqoop and the hadoop cli tools into their workflows. As part of our internal learning process we are also rethinking about how to make the runners API something that any member of the community can just use to extend Amaterasu, either privately or publically to share with the community. 
 - **YARN -** We chose Mesos because it is the best solution for the problem we were trying to solve, and we fell in love with it. Mesos is awesome and we believe it is the future of the ecosystem, but it is not as widespread as YARN. As we started rolling Amaterasu out, we encountered more and more organizations who were keen on giving Amaterasu a go, but found Mesos to be too big of a prerequisite. YARN is currently the more common resource management platform in the Big Data world, and as we mature, we understand more and more that we need to support it, so we will.

## Conclusion

The release of version 0.1.0 is the result of many months of work and a proud moment for us. It is the result of many years of learning how Big Data teams work together and while we hope that Amaterasu will play a key role, our main goal is to help create autonomous Big Data teams, and help developers, data scientists, and operations to collaborate, and improve the way we handle data.
 
[amaterasu-job-sample]: https://github.com/shintoio/amaterasu-job-sample
[amaterasu-demo-vagrant]: https://github.com/shintoio/amaterasu-demo-machine
[slack-app]: https://api.slack.com/slack-apps
[slack-tokens]: https://api.slack.com/docs/oauth-test-tokens
